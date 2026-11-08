# Спецификация: Удаление шаблонных заведений и компактный селектор заведений в шапке

**Дата:** 2026-11-08  
**Статус:** Утверждено (Approved)  
**Проект:** FinRest (`finrest`)  
**Область:** UI/UX навигации, шапка приложения (`Header`), контекст заведений (`AppContext`)

---

## 1. Введение и контекст проблемы

В текущей версии FinRest в верхней шапке приложения ([Header.tsx](file:///Users/fatima/Desktop/Khamzat/finrest/src/components/layout/Header.tsx)) заведения отображаются в виде горизонтального ряда кнопок на десктопе (`hidden sm:flex`) и отдельного `Popover` на мобильных экранах. 

При этом:
1. В [AppContext.tsx](file:///Users/fatima/Desktop/Khamzat/finrest/src/context/AppContext.tsx) начальное состояние заведений инициализируется демо-массивом `mockVenues`:
   * *«Ресторан «Оливье»»*
   * *«Кафе «Бистро»»*
   * *«Бар «Коктейль»»*
2. Пользователь при открытии страницы всегда видит эти шаблонные названия до загрузки реальных данных (или если база пуста).
3. Горизонтальный ряд кнопок загромождает шапку при наличии 3+ заведений и выглядит неаккуратно при длинных названиях ресторанов.

---

## 2. Цели и критерии приемки

### 2.1. Цели
1. **Компактный Dropdown:** Заменить горизонтальный ряд кнопок и дублирующий мобильный селектор на единый адаптивный выпадающий список (Dropdown) с отображением текущего активного заведения.
2. **Очистка от мок-заведений:** Полностью исключить автоматическую подстановку шаблонных названий ресторанов («Оливье», «Бистро», «Коктейль») в интерфейсе. Отображать только реальные заведения пользователя из базы данных PostgreSQL.
3. **Empty State & Навигация:** При отсутствии заведений отображать аккуратный призыв к действию: кнопку `+ Добавить заведение`, ведущую в раздел `/venues`.
4. **Отказоустойчивость:** Гарантировать корректную работу всех страниц системы (Дашборд, Транзакции, Отчёты, Инвентаризация, Дедупликация) при отсутствии выбранного заведения (`selectedVenueId = ''`).

### 2.2. Критерии приемки
- [ ] В `Header.tsx` реализован единый адаптивный `VenueDropdown`:
  - Кнопка-триггер: иконка `Building2`, название текущего ресторана с защитой от переполнения (`truncate`), стрелка `ChevronDown`.
  - Выпадающий список: перечень реальных ресторанов с отметкой активного (`✓`), разделитель и быстрая ссылка `+ Добавить заведение`.
  - Состояние без заведений: отображается кнопка `+ Добавить заведение`.
- [ ] В `AppContext.tsx` начальное состояние `venues` инициализируется пустым массивом `[]`, а `selectedVenueId` — пустой строкой `''` до загрузки из PostgreSQL.
- [ ] Шаблонные названия «Оливье», «Бистро», «Коктейль» больше не появляются при первичной загрузке страницы.
- [ ] Добавлены/обновлены тесты на рендеринг и логику работы селектора заведений.
- [ ] `npm test` проходит без ошибок.
- [ ] `npx tsc --noEmit` и `npm run lint` выполняются чисто.

---

## 3. Архитектура решения и изменения в коде

### 3.1. `src/components/layout/Header.tsx`
* Удалить разделение на два разных блока (мобильный Popover и десктопный flex-ряд кнопок).
* Реализовать единый компонент `VenueSelectorDropdown`:
  ```tsx
  {venues.length > 0 ? (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-9 px-3 gap-2 text-xs sm:text-sm font-medium border-border hover:bg-slate-50 transition-colors max-w-[180px] sm:max-w-[240px]"
          aria-label="Выбрать активное заведение"
        >
          <Building2 className="h-4 w-4 shrink-0 text-slate-500" />
          <span className="truncate">{currentVenue?.name || 'Выберите заведение'}</span>
          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-slate-400 opacity-70" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-1.5" align="end">
        <div className="space-y-1">
          {venues.map((venue) => (
            <button
              key={venue.id}
              onClick={() => {
                selectVenue(venue.id)
                setIsOpen(false)
              }}
              className={`w-full text-left px-2.5 py-2 text-xs sm:text-sm rounded-md transition-colors flex items-center justify-between ${
                selectedVenueId === venue.id
                  ? 'bg-emerald-50 text-emerald-900 font-semibold'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <span className="truncate pr-2">{venue.name}</span>
              {selectedVenueId === venue.id && <Check className="h-4 w-4 text-emerald-600 shrink-0" />}
            </button>
          ))}
          <div className="my-1 border-t border-slate-100" />
          <Link
            href="/venues"
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-1.5 w-full px-2.5 py-1.5 text-xs text-emerald-700 hover:bg-emerald-50 rounded-md font-medium transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Управление заведениями</span>
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  ) : (
    <Link href="/venues">
      <Button variant="outline" size="sm" className="h-9 px-3 gap-1.5 text-xs font-medium text-emerald-700 border-emerald-200 hover:bg-emerald-50">
        <Plus className="h-3.5 w-3.5" />
        <span>Добавить заведение</span>
      </Button>
    </Link>
  )}
  ```

### 3.2. `src/context/AppContext.tsx`
* Заменить начальное состояние:
  ```ts
  const [venues, setVenues] = useState<Venue[]>([])
  const [selectedVenueId, setSelectedVenueId] = useLocalStorage<string>(
    'finrest_selected_venue',
    ''
  )
  ```
* При загрузке `dbVenues` из `getVenuesAction()`:
  - Если заведения есть:
    - Проверить `selectedVenueId`: если он валиден и есть в списке `dbVenues`, оставить его.
    - Иначе установить `dbVenues[0].id`.
  - Если заведений нет (`dbVenues.length === 0`):
    - `setVenues([])`
    - `setSelectedVenueId('')`
* В методе `resetAllData()` не восстанавливать шаблонные названия заведений, а запрашивать актуальные заведения из базы данных.

---

## 4. План тестирования и верификации

1. **Компонентные тесты:**
   * Проверка рендеринга выпадающего меню при наличии заведений.
   * Проверка рендеринга кнопки «Добавить заведение» при пустом списке `venues`.
   * Проверка смены активного заведения при клике.
2. **Интеграционные тесты:**
   * Прогон `npm test` для подтверждения целостности всей финансовой логики.
3. **Статический анализ:**
   * `npx tsc --noEmit` — строгий контроль типов.
   * `npm run lint` — чистота кода и отсутствие неиспользуемых импортов.
