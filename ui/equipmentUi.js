(function (global) {
    'use strict';

    const SLOT_ORDER = ['weapon', 'armor', 'artifact'];

    function defaultBag() {
        return [
            { id: 'eq_bronze_spear', slot: 'weapon', name: 'Bronze Spear', desc: 'ATK +5', stat: { atk: 5 } },
            { id: 'eq_leather_armor', slot: 'armor', name: 'Leather Armor', desc: 'DEF +5', stat: { def: 5 } },
            { id: 'eq_old_talisman', slot: 'artifact', name: 'Old Talisman', desc: 'HP +20', stat: { hp: 20 } }
        ];
    }

    function ensureEquipmentState(game) {
        if (!game.equipmentState || typeof game.equipmentState !== 'object') {
            game.equipmentState = {};
        }
        if (!game.equipmentState.slots || typeof game.equipmentState.slots !== 'object') {
            game.equipmentState.slots = { weapon: null, armor: null, artifact: null };
        }
        SLOT_ORDER.forEach((slot) => {
            if (!Object.prototype.hasOwnProperty.call(game.equipmentState.slots, slot)) {
                game.equipmentState.slots[slot] = null;
            }
        });
        if (!Array.isArray(game.equipmentState.bag)) {
            game.equipmentState.bag = defaultBag();
        }
        return game.equipmentState;
    }

    function slotLabel(game, slot) {
        if (slot === 'weapon') return game.tr('ui.equipment.slot.weapon', {}, 'Weapon');
        if (slot === 'armor') return game.tr('ui.equipment.slot.armor', {}, 'Armor');
        if (slot === 'artifact') return game.tr('ui.equipment.slot.artifact', {}, 'Artifact');
        return slot;
    }

    function renderEquipmentModal(game) {
        const modal = document.getElementById('modal-equipment');
        const slotsEl = document.getElementById('equipment-slots');
        const bagEl = document.getElementById('equipment-bag');
        if (!modal || !slotsEl || !bagEl) return;

        const state = ensureEquipmentState(game);
        slotsEl.innerHTML = '';
        bagEl.innerHTML = '';

        SLOT_ORDER.forEach((slot) => {
            const equipped = state.slots[slot];
            const card = document.createElement('div');
            card.className = 'equipment-slot-card';
            card.innerHTML = `
                <div class="equipment-slot-label">${slotLabel(game, slot)}</div>
                <div class="equipment-slot-name">${equipped ? equipped.name : game.tr('ui.equipment.empty', {}, 'Empty')}</div>
                <div class="equipment-slot-desc">${equipped ? (equipped.desc || '-') : '-'}</div>
            `;
            if (equipped) {
                const btn = document.createElement('button');
                btn.className = 'equipment-btn unequip';
                btn.innerText = game.tr('ui.equipment.unequip', {}, 'Unequip');
                btn.onclick = () => unequipItem(game, slot);
                card.appendChild(btn);
            }
            slotsEl.appendChild(card);
        });

        if (!state.bag.length) {
            const empty = document.createElement('div');
            empty.className = 'text-xs text-gray-400';
            empty.innerText = game.tr('ui.equipment.bag_empty', {}, 'No equipment in bag');
            bagEl.appendChild(empty);
            return;
        }

        state.bag.forEach((item) => {
            const row = document.createElement('div');
            row.className = 'equipment-bag-row';
            row.innerHTML = `
                <div>
                    <div class="equipment-item-name">${item.name || item.id}</div>
                    <div class="equipment-item-meta">${slotLabel(game, item.slot)} · ${item.desc || '-'}</div>
                </div>
            `;
            const btn = document.createElement('button');
            btn.className = 'equipment-btn equip';
            btn.innerText = game.tr('ui.equipment.equip', {}, 'Equip');
            btn.onclick = () => equipItem(game, item.id);
            row.appendChild(btn);
            bagEl.appendChild(row);
        });
    }

    function openEquipmentModal(game) {
        ensureEquipmentState(game);
        const modal = document.getElementById('modal-equipment');
        if (!modal) return;
        renderEquipmentModal(game);
        modal.classList.add('open');
    }

    function closeEquipmentModal() {
        const modal = document.getElementById('modal-equipment');
        if (modal) modal.classList.remove('open');
    }

    function equipItem(game, itemId) {
        const state = ensureEquipmentState(game);
        const idx = state.bag.findIndex((x) => x && x.id === itemId);
        if (idx < 0) return;
        const item = state.bag[idx];
        const slot = item.slot;
        if (!slot || !Object.prototype.hasOwnProperty.call(state.slots, slot)) return;

        const prev = state.slots[slot];
        state.slots[slot] = item;
        state.bag.splice(idx, 1);
        if (prev) state.bag.push(prev);

        window.KOVPersistenceModule.saveGame(game);
        renderEquipmentModal(game);
        window.KOVUiShellModule.showToast(game, game.tr('toast.equipment_equipped', { name: item.name }, `${item.name} equipped`));
    }

    function unequipItem(game, slot) {
        const state = ensureEquipmentState(game);
        const item = state.slots[slot];
        if (!item) return;
        state.slots[slot] = null;
        state.bag.push(item);
        window.KOVPersistenceModule.saveGame(game);
        renderEquipmentModal(game);
        window.KOVUiShellModule.showToast(game, game.tr('toast.equipment_unequipped', { name: item.name }, `${item.name} unequipped`));
    }

    global.KOVEquipmentUiModule = {
        ensureEquipmentState,
        renderEquipmentModal,
        openEquipmentModal,
        closeEquipmentModal,
        equipItem,
        unequipItem
    };
})(window);


