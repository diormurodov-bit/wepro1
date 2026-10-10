/**
 * ==========================================================================
 * WEPRO WAREHOUSE — SCRIPT.JS
 * Чистый Vanilla JavaScript без зависимостей, библиотек, React и сборщиков.
 * Поддерживает запуск в любом браузере и через VS Code Live Server.
 * ==========================================================================
 */

document.addEventListener('DOMContentLoaded', () => {
  // ------------------------------------------------------------------------
  // 1. НАВИГАЦИЯ ПО РАЗДЕЛАМ (Склад, Блюда, Категории, Заказы, Клиенты, Поставщики, Отчёты)
  // ------------------------------------------------------------------------
  const navButtons = document.querySelectorAll('[data-nav-target]');
  const viewSections = document.querySelectorAll('.view-section');
  const mobileSidebar = document.getElementById('sidebar');
  const sidebarBackdrop = document.getElementById('sidebar-backdrop');
  const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
  const mobileSectionTag = document.getElementById('mobile-section-tag');

  function switchSection(targetId) {
    viewSections.forEach((sec) => {
      sec.classList.remove('active');
      if (sec.id === `section-${targetId}`) {
        sec.classList.add('active');
      }
    });

    navButtons.forEach((btn) => {
      if (btn.dataset.navTarget === targetId) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    const targetNames = {
      warehouse: 'Склад',
      dishes: 'Блюда',
      categories: 'Категории',
      orders: 'Заказы',
      clients: 'Клиенты',
      suppliers: 'Поставщики',
      reports: 'Отчёты',
    };

    if (mobileSectionTag) {
      mobileSectionTag.textContent = `· ${targetNames[targetId] || targetId}`;
    }

    // Закрываем мобильное меню при переходе
    if (mobileSidebar) mobileSidebar.classList.remove('mobile-open');
    if (sidebarBackdrop) sidebarBackdrop.classList.remove('active');

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  navButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.navTarget;
      if (target) switchSection(target);
    });
  });

  // Мобильный бургер
  if (mobileMenuToggle && mobileSidebar && sidebarBackdrop) {
    mobileMenuToggle.addEventListener('click', () => {
      mobileSidebar.classList.toggle('mobile-open');
      sidebarBackdrop.classList.toggle('active');
    });

    sidebarBackdrop.addEventListener('click', () => {
      mobileSidebar.classList.remove('mobile-open');
      sidebarBackdrop.classList.remove('active');
    });
  }

  // ------------------------------------------------------------------------
  // 2. ДАННЫЕ И ЖИВОЙ ПЕРЕСЧЁТ KPI СКЛАДА
  // ------------------------------------------------------------------------
  const kpiTotalStockEl = document.getElementById('kpi-total-val');
  const kpiReorderCountEl = document.getElementById('kpi-reorder-count');
  const kpiDangerCountEl = document.getElementById('kpi-danger-count');
  const kpiWarnCountEl = document.getElementById('kpi-warn-count');
  const kpiJulyPurchasesEl = document.getElementById('kpi-july-purchases');
  const kpiJulyWriteOffsEl = document.getElementById('kpi-july-writeoffs');

  let julyPurchasesVal = 1148700;
  let julyWriteOffsVal = 18400;

  function recalculateKPIs() {
    const rows = document.querySelectorAll('.item-row');
    let totalStockSum = 0;
    let dangerCount = 0;
    let warnCount = 0;

    rows.forEach((row) => {
      const valText = row.querySelector('.cell-value')?.textContent || '';
      const numVal = parseInt(valText.replace(/\D/g, ''), 10) || 0;
      totalStockSum += numVal;

      const status = row.dataset.status;
      if (status === 'danger') dangerCount++;
      if (status === 'warn') warnCount++;
    });

    const reorderTotal = dangerCount + warnCount;

    if (kpiTotalStockEl) kpiTotalStockEl.textContent = totalStockSum.toLocaleString('ru-RU') + ' ₽';
    if (kpiReorderCountEl) kpiReorderCountEl.textContent = reorderTotal;
    if (kpiDangerCountEl) kpiDangerCountEl.textContent = `${dangerCount} критично`;
    if (kpiWarnCountEl) kpiWarnCountEl.textContent = `${warnCount} заканчиваются`;

    // Бейдж в сайдбаре
    const sidebarBadge = document.getElementById('sidebar-warehouse-badge');
    if (sidebarBadge) sidebarBadge.textContent = reorderTotal;

    // Вкладки фильтров
    const tabWarn = document.getElementById('tab-count-warn');
    const tabDanger = document.getElementById('tab-count-danger');
    if (tabWarn) tabWarn.textContent = `Заканчиваются ${warnCount}`;
    if (tabDanger) tabDanger.textContent = `Критично ${dangerCount}`;

    // Пересчёт сумм по группам
    recalculateGroupSums();
  }

  function recalculateGroupSums() {
    ['ingredients', 'prep'].forEach((cat) => {
      const rows = document.querySelectorAll(`.item-row[data-category="${cat}"]`);
      let groupSum = 0;
      let visibleCount = 0;

      rows.forEach((r) => {
        if (r.style.display !== 'none') {
          const valText = r.querySelector('.cell-value')?.textContent || '';
          groupSum += parseInt(valText.replace(/\D/g, ''), 10) || 0;
          visibleCount++;
        }
      });

      const sumEl = document.getElementById(`sum-group-${cat}`);
      const countEl = document.getElementById(`count-group-${cat}`);
      if (sumEl) sumEl.textContent = `на складе ${groupSum.toLocaleString('ru-RU')} ₽`;
      if (countEl) countEl.textContent = `${visibleCount} поз.`;
    });
  }

  // ------------------------------------------------------------------------
  // 3. ПОИСК, ФИЛЬТРЫ И СОРТИРОВКА
  // ------------------------------------------------------------------------
  const searchInput = document.getElementById('search-input');
  const supplierFilter = document.getElementById('supplier-filter');
  const categoryFilter = document.getElementById('category-filter');
  const filterTabs = document.querySelectorAll('.tab-btn');
  const sortToggleBtn = document.getElementById('sort-toggle-btn');
  const sortArrow = document.getElementById('sort-arrow');

  let currentTabFilter = 'all';
  let sortAsc = true;

  function applyTableFilters() {
    const term = (searchInput?.value || '').trim().toLowerCase();
    const sup = supplierFilter?.value || '';
    const cat = categoryFilter?.value || '';

    const rows = document.querySelectorAll('.item-row');
    let visibleTotal = 0;

    rows.forEach((row) => {
      const name = (row.dataset.name || '').toLowerCase();
      const rowSupplier = (row.dataset.supplier || '').toLowerCase();
      const rowCat = row.dataset.category || '';
      const rowStatus = row.dataset.status || '';

      const matchSearch = !term || name.includes(term) || rowSupplier.includes(term);
      const matchSup = !sup || row.dataset.supplier === sup;
      const matchCat = !cat || rowCat === cat;

      let matchTab = true;
      if (currentTabFilter === 'warn') matchTab = rowStatus === 'warn';
      if (currentTabFilter === 'danger') matchTab = rowStatus === 'danger';

      const show = matchSearch && matchSup && matchCat && matchTab;
      row.style.display = show ? '' : 'none';
      if (show) visibleTotal++;
    });

    // Скрытие пустых заголовков групп
    ['ingredients', 'prep'].forEach((c) => {
      const headerRow = document.querySelector(`#tbody-${c} .table-group-row`);
      const visibleInGroup = document.querySelectorAll(`.item-row[data-category="${c}"]:not([style*="display: none"])`).length;
      if (headerRow) {
        headerRow.style.display = visibleInGroup > 0 ? '' : 'none';
      }
    });

    const infoEl = document.getElementById('pagination-info');
    if (infoEl) infoEl.textContent = `Показано ${visibleTotal} из 42 позиций`;

    recalculateGroupSums();
  }

  if (searchInput) searchInput.addEventListener('input', applyTableFilters);
  if (supplierFilter) supplierFilter.addEventListener('change', applyTableFilters);
  if (categoryFilter) categoryFilter.addEventListener('change', applyTableFilters);

  filterTabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      filterTabs.forEach((t) => t.classList.remove('active'));
      tab.classList.add('active');
      currentTabFilter = tab.dataset.filter || 'all';
      applyTableFilters();
    });
  });

  // Сортировка по дням
  if (sortToggleBtn) {
    sortToggleBtn.addEventListener('click', () => {
      sortAsc = !sortAsc;
      if (sortArrow) sortArrow.textContent = sortAsc ? '↑' : '↓';

      ['ingredients', 'prep'].forEach((cat) => {
        const tbody = document.getElementById(`tbody-${cat}`);
        if (!tbody) return;
        const rows = Array.from(tbody.querySelectorAll('.item-row'));
        rows.sort((a, b) => {
          const daysA = parseFloat(a.dataset.days) || 0;
          const daysB = parseFloat(b.dataset.days) || 0;
          return sortAsc ? daysA - daysB : daysB - daysA;
        });
        rows.forEach((r) => tbody.appendChild(r));
      });
    });
  }

  // ------------------------------------------------------------------------
  // 4. СТЕППЕРЫ ДОЗАКАЗА (− / +)
  // ------------------------------------------------------------------------
  document.querySelectorAll('.stepper-wrap').forEach((wrap) => {
    const decBtn = wrap.querySelector('.btn-dec');
    const incBtn = wrap.querySelector('.btn-inc');
    const valEl = wrap.querySelector('.stepper-val');
    const unit = valEl?.dataset.unit || 'кг';

    if (decBtn && incBtn && valEl) {
      decBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        let val = parseInt(valEl.textContent, 10) || 0;
        const step = unit === 'шт' ? 10 : 1;
        if (val > step) {
          val -= step;
          valEl.textContent = `${val} ${unit}`;
        }
      });

      incBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        let val = parseInt(valEl.textContent, 10) || 0;
        const step = unit === 'шт' ? 10 : 1;
        val += step;
        valEl.textContent = `${val} ${unit}`;
      });
    }
  });

  // ------------------------------------------------------------------------
  // 5. ВЫБОР ЧЕКБОКСАМИ
  // ------------------------------------------------------------------------
  const checkAll = document.getElementById('check-all');
  const itemCheckboxes = document.querySelectorAll('.item-checkbox');

  if (checkAll) {
    checkAll.addEventListener('change', () => {
      itemCheckboxes.forEach((cb) => {
        cb.checked = checkAll.checked;
      });
    });
  }

  itemCheckboxes.forEach((cb) => {
    cb.addEventListener('change', () => {
      const allSelected = Array.from(itemCheckboxes).every((c) => c.checked);
      if (checkAll) checkAll.checked = allSelected;
    });
  });

  // ------------------------------------------------------------------------
  // 6. МОДАЛЬНЫЕ ОКНА: ЗАКАЗ, ЭКСПОРТ, ИНВЕНТАРИЗАЦИЯ, СПИСАНИЕ
  // ------------------------------------------------------------------------
  const modalOrder = document.getElementById('modal-order');
  const modalExport = document.getElementById('modal-export');
  const modalInventory = document.getElementById('modal-inventory');
  const modalWriteoff = document.getElementById('modal-writeoff');

  function openModal(modal) {
    if (modal) modal.classList.add('active');
  }

  function closeModal(modal) {
    if (modal) modal.classList.remove('active');
  }

  // Закрытие по крестику или фону
  document.querySelectorAll('.modal-close-btn, [data-modal-close]').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.modal-overlay').forEach(closeModal);
    });
  });

  document.querySelectorAll('.modal-overlay').forEach((overlay) => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeModal(overlay);
    });
  });

  // Открытие модалки создания заказа
  const btnCreateOrder = document.getElementById('btn-create-order');
  const btnMobileOrder = document.getElementById('btn-mobile-order');

  function initOrderModal() {
    const listContainer = document.getElementById('order-items-list');
    const orderSumEl = document.getElementById('order-total-sum');
    if (!listContainer || !orderSumEl) return;

    listContainer.innerHTML = '';
    let totalOrderSum = 0;

    const rows = document.querySelectorAll('.item-row');
    rows.forEach((row) => {
      const stepperValEl = row.querySelector('.stepper-val');
      if (stepperValEl) {
        const qty = parseInt(stepperValEl.textContent, 10) || 0;
        const price = parseInt(row.dataset.price, 10) || 0;
        const name = row.dataset.name || '';
        const supplier = row.dataset.supplier || '';
        const unit = stepperValEl.dataset.unit || 'кг';
        const sum = qty * price;
        totalOrderSum += sum;

        const itemDiv = document.createElement('div');
        itemDiv.className = 'p-3 rounded-lg border flex items-center justify-between';
        itemDiv.style.background = '#FAF9F6';
        itemDiv.style.borderColor = '#E8E8E4';
        itemDiv.innerHTML = `
          <div>
            <div style="font-weight: 600; font-size: 13px;">${name}</div>
            <div style="font-size: 11px; color: #8E9297;">${supplier} · ${price} ₽ / ${unit}</div>
          </div>
          <div style="text-align: right;">
            <div style="font-weight: 700; font-size: 13px;">${qty} ${unit}</div>
            <div style="font-size: 11px; color: #8E9297;">${sum.toLocaleString('ru-RU')} ₽</div>
          </div>
        `;
        listContainer.appendChild(itemDiv);
      }
    });

    orderSumEl.textContent = `${totalOrderSum.toLocaleString('ru-RU')} ₽`;
    orderSumEl.dataset.currentOrderSum = totalOrderSum;
    openModal(modalOrder);
  }

  if (btnCreateOrder) btnCreateOrder.addEventListener('click', initOrderModal);
  if (btnMobileOrder) btnMobileOrder.addEventListener('click', initOrderModal);

  // Подтверждение заказа
  const btnConfirmOrder = document.getElementById('btn-confirm-order');
  if (btnConfirmOrder) {
    btnConfirmOrder.addEventListener('click', () => {
      const sumEl = document.getElementById('order-total-sum');
      const sum = parseInt(sumEl?.dataset.currentOrderSum, 10) || 0;

      // Пополнение остатков позиций и снятие критического статуса
      const rows = document.querySelectorAll('.item-row');
      rows.forEach((row) => {
        const stepperVal = row.querySelector('.stepper-val');
        if (stepperVal) {
          const qty = parseInt(stepperVal.textContent, 10) || 0;
          const currentRem = parseFloat(row.dataset.remainder) || 0;
          const price = parseInt(row.dataset.price, 10) || 0;
          const newRem = (currentRem + qty).toFixed(1);
          const newDays = ((parseFloat(row.dataset.days) || 0) + 10).toFixed(1);
          const newValue = Math.round(newRem * price);

          row.dataset.remainder = newRem;
          row.dataset.days = newDays;
          row.dataset.status = 'ok';

          // Обновление ячеек
          const stockAmount = row.querySelector('.stock-amount');
          const cellDays = row.querySelector('.cell-days');
          const cellVal = row.querySelector('.cell-value');
          const barFill = row.querySelector('.stock-bar-fill');
          const badge = row.querySelector('.badge');

          if (stockAmount) stockAmount.textContent = `${newRem} ${stepperVal.dataset.unit || 'кг'}`;
          if (cellDays) {
            cellDays.textContent = `${newDays} дн`;
            cellDays.className = 'cell-days text-normal tabular-nums';
          }
          if (cellVal) cellVal.textContent = `${newValue.toLocaleString('ru-RU')} ₽`;
          if (barFill) {
            barFill.className = 'stock-bar-fill ok';
            barFill.style.width = '85%';
          }
          if (badge) {
            badge.className = 'badge badge--ok';
            badge.textContent = 'В норме';
          }
        }
      });

      // Добавление заказа в таблицу заказов
      const ordersTbody = document.getElementById('orders-table-body');
      if (ordersTbody) {
        const ordTr = document.createElement('tr');
        ordTr.style.borderBottom = '1px solid #F0EFEA';
        ordTr.innerHTML = `
          <td style="padding: 12px 16px; font-weight: 700;">№ 1043</td>
          <td style="padding: 12px 16px; font-weight: 600;">Тесоро, Норд Фиш, Овощная база</td>
          <td style="padding: 12px 16px; color: #8E9297;">Сегодня</td>
          <td style="padding: 12px 16px; text-align: center;">6</td>
          <td style="padding: 12px 16px; text-align: right; font-weight: 700;">${sum.toLocaleString('ru-RU')} ₽</td>
          <td style="padding: 12px 16px; text-align: center;">
            <span class="badge badge--warn">В пути</span>
          </td>
        `;
        ordersTbody.prepend(ordTr);
      }

      julyPurchasesVal += sum;
      if (kpiJulyPurchasesEl) kpiJulyPurchasesEl.textContent = `${julyPurchasesVal.toLocaleString('ru-RU')} ₽`;

      closeModal(modalOrder);
      recalculateKPIs();
      showToast(`Заказ поставщикам на сумму ${sum.toLocaleString('ru-RU')} ₽ успешно отправлен! Остатки пополнены.`);
    });
  }

  // Экспорт CSV
  const btnExport = document.getElementById('btn-export');
  const btnDownloadCsv = document.getElementById('btn-download-csv');
  const btnCopyExport = document.getElementById('btn-copy-export');

  if (btnExport) {
    btnExport.addEventListener('click', () => {
      openModal(modalExport);
    });
  }

  function generateCSV() {
    const rows = document.querySelectorAll('.item-row');
    const csvLines = [
      ['Позиция', 'Поставщик / Подпись', 'Остаток', 'Запас дней', 'Расход / мес', 'Цена за ед', 'На складе', 'Статус'].join(';')
    ];

    rows.forEach((r) => {
      const name = r.dataset.name || '';
      const supplier = r.dataset.supplier || '';
      const days = r.dataset.days || '';
      const status = r.dataset.status === 'danger' ? 'Критично' : r.dataset.status === 'warn' ? 'Заканчивается' : 'В норме';
      const stock = r.querySelector('.stock-amount')?.textContent || '';
      const usage = r.querySelector('.usage-primary')?.textContent || '';
      const price = r.querySelector('.cell-price')?.textContent || '';
      const val = r.querySelector('.cell-value')?.textContent || '';

      csvLines.push([`"${name}"`, `"${supplier}"`, `"${stock}"`, days, `"${usage}"`, `"${price}"`, `"${val}"`, status].join(';'));
    });

    return '\uFEFF' + csvLines.join('\r\n');
  }

  if (btnDownloadCsv) {
    btnDownloadCsv.addEventListener('click', () => {
      const content = generateCSV();
      const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `wepro_warehouse_export_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      closeModal(modalExport);
      showToast('Ведомость остатков склада скачана (CSV для Excel)');
    });
  }

  if (btnCopyExport) {
    btnCopyExport.addEventListener('click', () => {
      const rows = document.querySelectorAll('.item-row');
      const text = Array.from(rows).map((r) => {
        return `${r.dataset.name}\t${r.querySelector('.stock-amount')?.textContent}\t${r.querySelector('.cell-price')?.textContent}\t${r.querySelector('.cell-value')?.textContent}`;
      }).join('\n');
      navigator.clipboard.writeText(text);
      showToast('Данные таблицы скопированы в буфер обмена!');
    });
  }

  // Инвентаризация
  const btnInventory = document.getElementById('btn-inventory');
  const sidebarInventoryCard = document.getElementById('sidebar-inventory-widget');
  const btnFinishInventory = document.getElementById('btn-finish-inventory');

  if (btnInventory) btnInventory.addEventListener('click', () => openModal(modalInventory));
  if (sidebarInventoryCard) sidebarInventoryCard.addEventListener('click', () => openModal(modalInventory));
  if (btnFinishInventory) {
    btnFinishInventory.addEventListener('click', () => {
      closeModal(modalInventory);
      showToast('Инвентаризация завершена! Фактические остатки подтверждены.');
    });
  }

  // Действия со строкой (···) и Списание
  let currentActionRow = null;
  document.querySelectorAll('.row-action-btn').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const row = btn.closest('.item-row');
      currentActionRow = row;

      const itemName = row?.dataset.name || '';
      const remainder = row?.dataset.remainder || '1';
      const unit = row?.dataset.unit || 'кг';

      const writeoffTitle = document.getElementById('writeoff-item-name');
      const writeoffInput = document.getElementById('writeoff-amount-input');
      const writeoffUnit = document.getElementById('writeoff-unit-label');

      if (writeoffTitle) writeoffTitle.textContent = `${itemName} (на складе: ${remainder} ${unit})`;
      if (writeoffInput) {
        writeoffInput.max = remainder;
        writeoffInput.value = Math.min(1, parseFloat(remainder));
      }
      if (writeoffUnit) writeoffUnit.textContent = ` (${unit})`;

      openModal(modalWriteoff);
    });
  });

  const btnConfirmWriteoff = document.getElementById('btn-confirm-writeoff');
  if (btnConfirmWriteoff) {
    btnConfirmWriteoff.addEventListener('click', () => {
      if (!currentActionRow) return;
      const amountInput = document.getElementById('writeoff-amount-input');
      const reasonSelect = document.getElementById('writeoff-reason-select');
      const amount = parseFloat(amountInput?.value) || 0;
      const reason = reasonSelect?.value || 'Истечение срока годности';

      const currentRem = parseFloat(currentActionRow.dataset.remainder) || 0;
      const price = parseInt(currentActionRow.dataset.price, 10) || 0;

      if (amount <= 0 || amount > currentRem) {
        alert('Укажите корректное количество для списания!');
        return;
      }

      const newRem = Math.max(0, currentRem - amount).toFixed(1);
      const newValue = Math.round(newRem * price);
      const writeoffSum = Math.round(amount * price);

      currentActionRow.dataset.remainder = newRem;
      const stockAmount = currentActionRow.querySelector('.stock-amount');
      const cellVal = currentActionRow.querySelector('.cell-value');

      if (stockAmount) stockAmount.textContent = `${newRem} ${currentActionRow.dataset.unit || 'кг'}`;
      if (cellVal) cellVal.textContent = `${newValue.toLocaleString('ru-RU')} ₽`;

      julyWriteOffsVal += writeoffSum;
      if (kpiJulyWriteOffsEl) kpiJulyWriteOffsEl.textContent = `${julyWriteOffsVal.toLocaleString('ru-RU')} ₽`;

      closeModal(modalWriteoff);
      recalculateKPIs();
      showToast(`Списано ${amount} ${currentActionRow.dataset.unit} (${writeoffSum.toLocaleString('ru-RU')} ₽). Причина: ${reason}`);
    });
  }

  // Кнопка добавления блюда
  const btnAddDish = document.getElementById('btn-add-dish');
  if (btnAddDish) {
    btnAddDish.addEventListener('click', () => {
      showToast('Добавление нового блюда: откройте технологическую карту');
    });
  }

  // ------------------------------------------------------------------------
  // 7. КУЛИНАРНОЕ МЕНЮ: ТЕХКАРТЫ И СТОП-ЛИСТ
  // ------------------------------------------------------------------------
  const modalRecipe = document.getElementById('modal-recipe');
  const recipeData = {
    pizza: {
      title: 'Пицца со страчателлой и томатами',
      subtitle: 'Пицца из дровяной печи · 420 г · Шеф-пиццайоло',
      cost: '215 ₽',
      price: '790 ₽',
      margin: '72.8%',
      ingredients: [
        { name: 'Страчателла (сыр)', amount: '110 г', cost: '95 ₽', stock: '2,1 кг (Мало)' },
        { name: 'Томаты черри', amount: '80 г', cost: '38 ₽', stock: '5,8 кг (Мало)' },
        { name: 'Тесто для пиццы шар', amount: '280 г', cost: '42 ₽', stock: '62 шт (В норме)' },
        { name: 'Масло оливковое EV', amount: '15 мл', cost: '25 ₽', stock: '34 л (В норме)' },
        { name: 'Базилик свежий', amount: '10 г', cost: '15 ₽', stock: '0,9 кг (В норме)' }
      ]
    },
    steak: {
      title: 'Стейк Рибай с перечным соусом',
      subtitle: 'Мясо и гриль · 350 г · Степень Medium',
      cost: '980 ₽',
      price: '3 450 ₽',
      margin: '71.6%',
      ingredients: [
        { name: 'Рибай зачищенный Prime', amount: '340 г', cost: '820 ₽', stock: '21,6 кг (В норме)' },
        { name: 'Бульон концентрированный даси', amount: '50 мл', cost: '45 ₽', stock: '11,5 л (В норме)' },
        { name: 'Масло оливковое EV', amount: '15 мл', cost: '25 ₽', stock: '34 л (В норме)' },
        { name: 'Сливочное фермерское масло', amount: '20 г', cost: '28 ₽', stock: '8,4 кг (В норме)' },
        { name: 'Микс 4 перца и морская соль', amount: '8 г', cost: '22 ₽', stock: '2,5 кг (В норме)' },
        { name: 'Розмарин свежий', amount: '5 г', cost: '40 ₽', stock: '1,2 кг (В норме)' }
      ]
    },
    tagliatelle: {
      title: 'Тальятелле со свежим лососем',
      subtitle: 'Свежая паста собственного производства · 310 г',
      cost: '260 ₽',
      price: '890 ₽',
      margin: '70.8%',
      ingredients: [
        { name: 'Паста яичная свежая тальятелле', amount: '150 г', cost: '45 ₽', stock: '3,4 кг (Дефицит)' },
        { name: 'Лосось охлаждённый филе', amount: '110 г', cost: '160 ₽', stock: '8,4 кг (Критично)' },
        { name: 'Соус понзу цитрусовый', amount: '30 мл', cost: '28 ₽', stock: '4,2 л (Заканчивается)' },
        { name: 'Сливки кулинарные 33%', amount: '50 мл', cost: '27 ₽', stock: '14 л (В норме)' }
      ]
    },
    tartar: {
      title: 'Тартар из лосося с понзу',
      subtitle: 'Холодные закуски & Raw Bar · 180 г',
      cost: '195 ₽',
      price: '760 ₽',
      margin: '74.3%',
      ingredients: [
        { name: 'Лосось охлаждённый (нарезка кубик)', amount: '110 г', cost: '140 ₽', stock: '8,4 кг (Критично)' },
        { name: 'Соус понзу цитрусовый', amount: '25 мл', cost: '22 ₽', stock: '4,2 л (Заканчивается)' },
        { name: 'Масло оливковое EV', amount: '10 мл', cost: '15 ₽', stock: '34 л (В норме)' },
        { name: 'Каперсы и шалот', amount: '20 г', cost: '18 ₽', stock: '3,8 кг (В норме)' }
      ]
    },
    focaccia: {
      title: 'Фокачча домашняя с розмарином',
      subtitle: 'Выпечка пекарни гастробара · 250 г',
      cost: '45 ₽',
      price: '320 ₽',
      margin: '85.9%',
      ingredients: [
        { name: 'Мука Манитоба W380', amount: '160 г', cost: '20 ₽', stock: '96 кг (В норме)' },
        { name: 'Масло оливковое EV', amount: '30 мл', cost: '18 ₽', stock: '34 л (В норме)' },
        { name: 'Розмарин свежий и флёр-де-сель', amount: '8 г', cost: '7 ₽', stock: '3,5 кг (В норме)' }
      ]
    },
    ramen: {
      title: 'Рамен на бульоне даси с рибаем',
      subtitle: 'Горячие супы кухни · 450 г',
      cost: '220 ₽',
      price: '850 ₽',
      margin: '74.1%',
      ingredients: [
        { name: 'Бульон даси концентрированный', amount: '280 мл', cost: '75 ₽', stock: '11,5 л (В норме)' },
        { name: 'Рибай слайсы (мраморная говядина)', amount: '60 г', cost: '95 ₽', stock: '21,6 кг (В норме)' },
        { name: 'Лапша рамен пшеничная', amount: '110 г', cost: '25 ₽', stock: '18 кг (В норме)' },
        { name: 'Яйцо адзитама маринованное', amount: '1 шт', cost: '25 ₽', stock: '45 шт (В норме)' }
      ]
    }
  };

  document.querySelectorAll('.btn-open-recipe').forEach((btn) => {
    btn.addEventListener('click', () => {
      const recipeKey = btn.dataset.recipe;
      const data = recipeData[recipeKey];
      if (!data) return;

      const titleEl = document.getElementById('recipe-modal-title');
      const subEl = document.getElementById('recipe-modal-subtitle');
      const costEl = document.getElementById('recipe-modal-cost');
      const priceEl = document.getElementById('recipe-modal-price');
      const marginEl = document.getElementById('recipe-modal-margin');
      const tbody = document.getElementById('recipe-modal-ingredients-body');

      if (titleEl) titleEl.textContent = data.title;
      if (subEl) subEl.textContent = data.subtitle;
      if (costEl) costEl.textContent = data.cost;
      if (priceEl) priceEl.textContent = data.price;
      if (marginEl) marginEl.textContent = data.margin;

      if (tbody) {
        tbody.innerHTML = '';
        data.ingredients.forEach((ing) => {
          const tr = document.createElement('tr');
          tr.innerHTML = `
            <td style="font-weight: 500;">${ing.name}</td>
            <td>${ing.amount}</td>
            <td style="text-align: right; font-weight: 600;">${ing.cost}</td>
            <td style="text-align: right; color: #5F6368;">${ing.stock}</td>
          `;
          tbody.appendChild(tr);
        });
      }

      openModal(modalRecipe);
    });
  });

  // Переключение "В стоп-лист" / "Снять со стоп-листа"
  document.querySelectorAll('.btn-toggle-stop').forEach((btn) => {
    btn.addEventListener('click', () => {
      const card = btn.closest('.dish-card');
      if (!card) return;

      const badge = card.querySelector('.dish-status-badge');
      const dishTitle = card.querySelector('.dish-title')?.textContent || 'Блюдо';

      const isStopped = card.classList.contains('dish-stopped');

      if (isStopped) {
        // Снять со стоп-листа
        card.classList.remove('dish-stopped');
        btn.textContent = 'В стоп-лист';
        if (badge) {
          badge.className = 'badge badge--ok dish-status-badge';
          badge.textContent = 'В наличии';
        }
        showToast(`✓ Блюдо «${dishTitle}» снято со стоп-листа`);
      } else {
        // Отправить в стоп-лист
        card.classList.add('dish-stopped');
        btn.textContent = 'Снять со стоп-листа';
        if (badge) {
          badge.className = 'badge badge--danger dish-status-badge';
          badge.textContent = 'Стоп-лист';
        }
        showToast(`✕ Блюдо «${dishTitle}» переведено в стоп-лист кухни`);
      }

      // Пересчёт счётчика в стоп-листе
      const totalStopped = document.querySelectorAll('.dish-card.dish-stopped').length;
      const kpiStopEl = document.getElementById('kpi-dish-stop-count');
      if (kpiStopEl) {
        kpiStopEl.textContent = `${totalStopped} в стоп-листе`;
      }
    });
  });

  // Всплывающее уведомление
  function showToast(msg) {
    const existing = document.querySelector('.toast-notice');
    if (existing) existing.remove();

    const t = document.createElement('div');
    t.className = 'toast-notice';
    t.textContent = msg;
    document.body.appendChild(t);

    setTimeout(() => {
      t.style.opacity = '0';
      setTimeout(() => t.remove(), 250);
    }, 2800);
  }

  // Первоначальный расчёт
  recalculateKPIs();
});
