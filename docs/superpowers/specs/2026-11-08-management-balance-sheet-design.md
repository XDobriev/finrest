# Спецификация: Управленческий баланс и рабочий капитал (Management Balance Sheet & NWC)

**Дата:** 2026-11-08  
**Статус:** Утверждено (Approved)  
**Проект:** FinRest (`finrest`)  
**Область:** Финансовая отчетность ресторанного бизнеса (HoReCa)

---

## 1. Введение и бизнес-контекст

В классическом финансовом менеджменте HoReCa отчетность базируется на **трех китах**:
1. **ДДС (Cash Flow)** — фиксирует фактические притоки и оттоки живых денег, предохраняя от сиюминутного кассового разрыва.
2. **ОПиУ (P&L)** — фиксирует доходы и расходы методом начисления, определяя маржинальность и чистую прибыль.
3. **Управленческий баланс (Balance Sheet)** — фиксирует срез активов (чем владеет бизнес), обязательств (кому и сколько должен) и собственного капитала.

До настоящего момента в FinRest функционировали только ДДС и ОПиУ. Это создавало риск классических ошибок ресторатора:
- **Вывод ложных дивидендов:** когда собственник изымает остаток денег на расчетном счете, не учитывая накопленные долги перед поставщиками продуктов и задолженность по зарплате за прошедший месяц.
- **Омертвление оборотки:** неконтролируемое замораживание денег в избыточных запасах бара и кухни.

Данная спецификация описывает реализацию **Операционного управленческого баланса (Working Capital & NWC)** — практичного, легковесного и надежного инструмента контроля ликвидности и безопасного распределения дивидендов.

---

## 2. Цели и критерии приемки

### 2.1. Цели
1. Замкнуть финансовый контур FinRest, добавив 3-ю вкладку **«Баланс»** на странице [Отчетов](file:///Users/fatima/Desktop/Khamzat/finrest/src/app/reports/page.tsx).
2. Автоматизировать расчет оборотных активов:
   - Денежные средства подтягиваются из итогового сальдо ДДС на конец месяца.
   - Стоимость товарных запасов кухни и бара рассчитывается из ревизий модуля [Инвентаризации](file:///Users/fatima/Desktop/Khamzat/finrest/src/app/inventory/page.tsx).
3. Обеспечить простой ввод и фиксацию обязательств (поставщики, ФОТ, налоги, авансы за банкеты) через ежемесячный снимок (**Monthly Balance Snapshot**) в PostgreSQL.
4. Предоставить ресторатору автоматический **«Калькулятор безопасных дивидендов»** и расчет чистого оборотного капитала ($NWC$) с цветовым индикатором текущей ликвидности ($CR$).
5. Реализовать экспорт балансового отчета в Excel (`.xlsx`).

### 2.2. Критерии приемки
- [ ] Prisma-модель `BalanceSnapshot` мигрирована в PostgreSQL.
- [ ] Серверный репозиторий `src/lib/db/balance.ts` и Server Action `src/app/actions/balance.ts` обеспечивают CRUD с валидацией сессии и ролей.
- [ ] Чистая математическая библиотека `src/lib/reports/balance.ts` рассчитывает $NWC$, $CR$, $SafetyBuffer$ и $MaxDividend$ со 100% покрытием тестами.
- [ ] Компонент `src/components/reports/BalanceReport.tsx` отображает двухколоночный баланс, радар ликвидности и поля редактирования.
- [ ] Экспорт `exportBalanceToExcel` генерирует корректный структурированный `.xlsx` файл.
- [ ] Все сквозные тесты `npm test`, сборка `npm run build` и линтер `npm run lint` проходят без единого замечания.

---

## 3. Архитектура данных (Database & Server Layer)

### 3.1. Схема Prisma (`prisma/schema.prisma`)
Добавляется модель `BalanceSnapshot`:

```prisma
model BalanceSnapshot {
  id                 String   @id @default(cuid())
  venueId            String
  venue              Venue    @relation(fields: [venueId], references: [id], onDelete: Cascade)
  monthKey           String   // Формат "YYYY-MM" (например, "2026-11")

  // Оборотные активы
  cashAmount         Float    @default(0) // Деньги: касса, сейф, р/с, эквайринг в пути
  inventoryFood      Float    @default(0) // Остаток кухни (из ревизии)
  inventoryBar       Float    @default(0) // Остаток бара (из ревизии)
  accountsReceivable Float    @default(0) // Дебиторка (агрегаторы, банкеты, подотчет)

  // Краткосрочные обязательства
  accountsPayable    Float    @default(0) // Долг перед поставщиками продуктов и алкоголя
  payrollPayable     Float    @default(0) // Начисленный ФОТ к выплате
  taxesPayable       Float    @default(0) // Налоги и страховые взносы к уплате
  guestPrepayments   Float    @default(0) // Авансы за банкеты и сертификаты

  // Параметры риск-менеджмента
  safetyReserveDays  Int      @default(10) // Дней операционного резерва (7 - 30)

  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt

  @@unique([venueId, monthKey])
  @@index([venueId])
}
```

В модель `Venue` добавляется обратная связь:
```prisma
balanceSnapshots BalanceSnapshot[]
```

### 3.2. Репозиторий (`src/lib/db/balance.ts`)
1. `getBalanceSnapshot(venueId: string, monthKey: string)`:
   - Ищет сохраненный снимок в `prisma.balanceSnapshot`.
   - Если снимка нет, вычисляет дефолтные значения:
     - `cashAmount`: сальдо ДДС на конец месяца (из транзакций и начального баланса `CashBalance`).
     - `inventoryFood`: сумма `actualQty * pricePerUnit` из `InventoryItem` с `category = 'food'`.
     - `inventoryBar`: сумма `actualQty * pricePerUnit` из `InventoryItem` с `category = 'bar'`.
     - Обязательства инициализируются `0` (или значениями предыдущего месяца).
2. `upsertBalanceSnapshot(data: UpsertBalanceInput)`:
   - Создает или обновляет запись в БД по уникальному составному ключу `(venueId, monthKey)`.

### 3.3. Server Action (`src/app/actions/balance.ts`)
- Проверяет аутентификацию пользователя через сессионный JWT токен.
- Проверяет роль пользователя (`OWNER`, `MANAGER`, `ACCOUNTANT`).
- Вызывает `upsertBalanceSnapshot` и делает `revalidatePath('/reports')`.

---

## 4. Финансовая бизнес-логика и расчетные формулы (`src/lib/reports/balance.ts`)

### 4.1. Агрегаты
1. **Суммарные оборотные активы:**
   $$\text{CurrentAssets} = \text{cashAmount} + \text{inventoryFood} + \text{inventoryBar} + \text{accountsReceivable}$$
2. **Суммарные краткосрочные обязательства:**
   $$\text{CurrentLiabilities} = \text{accountsPayable} + \text{payrollPayable} + \text{taxesPayable} + \text{guestPrepayments}$$
3. **Чистый оборотный капитал ($NWC$):**
   $$NWC = \text{CurrentAssets} - \text{CurrentLiabilities}$$

### 4.2. Коэффициент текущей ликвидности ($CR$)
$$CR = \begin{cases} 
\dfrac{\text{CurrentAssets}}{\text{CurrentLiabilities}}, & \text{если } \text{CurrentLiabilities} > 0 \\
\infty, & \text{если } \text{CurrentLiabilities} = 0 
\end{cases}$$

Статусы:
- `healthy` ($CR \ge 1.0$): Зеленый. Активы перекрывают краткосрочные обязательства.
- `warning` ($0.7 \le CR < 1.0$): Желтый. Допустимый диапазон для ресторанов с ежедневной выручкой, но требует контроля.
- `critical` ($CR < 0.7$): Красный. Угроза неплатежеспособности и остановки поставок.

### 4.3. Калькулятор безопасных дивидендов (Safe Dividends Engine)
1. **Среднедневной OPEX (на основе ОПиУ):**
   $$\text{DailyOPEX} = \frac{\text{operatingExpenses.total}}{30}$$
2. **Неснижаемый буфер безопасности:**
   $$\text{SafetyBuffer} = \text{DailyOPEX} \times \text{safetyReserveDays}$$
3. **Максимально допустимые дивиденды:**
   $$\text{AvailableDividend} = \text{cashAmount} - \text{CurrentLiabilities} - \text{SafetyBuffer}$$
   $$\text{SafeDividend} = \max(0, \text{AvailableDividend})$$
4. **Статус выплаты дивидендов:**
   - Если $\text{AvailableDividend} > 0$: `isSafe = true`, статус *«Доступно к безопасному изъятию»*.
   - Если $\text{AvailableDividend} \le 0$: `isSafe = false`, статус *«Выплата дивидендов приведет к дефициту оборотных средств на сумму |AvailableDividend| ₽»*.

---

## 5. Пользовательский интерфейс и UX

### 5.1. Интеграция в `src/app/reports/page.tsx`
- В `TabsList` добавляется триггер: `<TabsTrigger value="balance">Баланс</TabsTrigger>`.
- Во вкладку монтируется компонент `<BalanceReport />` с передачей рассчитанных данных и коллбэка сохранения.
- В блоке действий размещается кнопка **«Скачать Баланс (Excel)»**.

### 5.2. Компонент `src/components/reports/BalanceReport.tsx`
1. **Информационный радар (верхний ряд):**
   - Карточка $NWC$ (Чистый оборотный капитал).
   - Карточка $CR$ (Ликвидность со светофорным бейджем).
   - Карточка безопасных дивидендов (зеленая сумма или красный warning-алерт).
2. **Двухколоночный баланс:**
   - **Колонка Активов:** Деньги, Склад кухни, Склад бара, Дебиторка. Итого активов.
   - **Колонка Обязательств:** Долг поставщикам, Зарплата к выплате, Налоги, Авансы за банкеты. Итого обязательств.
3. **Панель настроек и фиксации:**
   - Поле выбора дней резерва (7 / 10 / 14 / 21 / 30 дней).
   - Кнопка «Зафиксировать снимок баланса» с анимацией сохранения.

### 5.3. Экспорт в Excel (`src/lib/excel/export-balance.ts`)
- Использует библиотеку `exceljs`.
- Формирует брендированный лист с заголовком ресторана, отчетным месяцем, структурированной таблицей Активов/Обязательств, расчетом $NWC$, $CR$ и вердиктом по дивидендам.

---

## 6. План тестирования (TDD)

1. **Unit-тесты формул (`tests/balance-calc.test.ts`):**
   - Расчет $NWC$ (положительный, отрицательный, нулевой).
   - Расчет $CR$ и граничных условий деления на 0.
   - Расчет лимита дивидендов при избытке и дефиците ликвидности.
2. **Интеграционные тесты репозитория (`tests/balance-db.test.ts`):**
   - Корректный дефолтный расчет из ДДС и ревизий.
   - Корректный `upsert` снимка в БД.
3. **Регрессионные тесты:**
   - Проверка работоспособности существующих 25 тестов проекта.
   - `npx tsc --noEmit` и `npm run lint`.
