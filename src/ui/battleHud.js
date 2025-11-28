import { onFlagChange, getFlag } from '../state/gameFlags.js';

const DEFAULT_ACTION_OPTIONS = Object.freeze([
    { id: 'fight', label: 'Luchar' },
    { id: 'bag', label: 'Mochila' },
    { id: 'pokemon', label: 'Pokémon' },
    { id: 'run', label: 'Huir' }
]);

function getCanvasContainer() {
    return document.getElementById('canvas-container') || document.body;
}

function createDialogueFrame(parent, extraClass = '') {
    const outer = document.createElement('div');
    outer.className = `dialogue-outer-border ${extraClass}`.trim();

    const middle = document.createElement('div');
    middle.className = 'dialogue-middle-border';
    outer.appendChild(middle);

    const box = document.createElement('div');
    box.className = 'dialogue-box';
    middle.appendChild(box);

    const inner = document.createElement('div');
    inner.className = 'dialogue-inner';
    box.appendChild(inner);

    const texture = document.createElement('div');
    texture.className = 'dialogue-paint-texture';
    inner.appendChild(texture);

    ['corner-tl', 'corner-tr', 'corner-bl', 'corner-br'].forEach((cornerClass) => {
        const corner = document.createElement('div');
        corner.className = `dialogue-corner ${cornerClass}`;
        inner.appendChild(corner);
    });

    const content = document.createElement('div');
    content.className = 'dialogue-content';
    inner.appendChild(content);

    parent.appendChild(outer);

    return { outer, content };
}

function createPokemonPanel(parent, side) {
    const wrapper = document.createElement('div');
    wrapper.className = `battle-pokemon-panel ${side}`;
    parent.appendChild(wrapper);

    const { content } = createDialogueFrame(wrapper, 'battle-info-shell');

    const header = document.createElement('div');
    header.className = 'battle-info-header';
    content.appendChild(header);

    const nameEl = document.createElement('span');
    nameEl.className = 'battle-pokemon-name';
    nameEl.textContent = '---';
    header.appendChild(nameEl);

    const levelEl = document.createElement('span');
    levelEl.className = 'battle-pokemon-level';
    levelEl.textContent = 'Lv --';
    header.appendChild(levelEl);

    const hpRow = document.createElement('div');
    hpRow.className = 'battle-info-hp-row';
    content.appendChild(hpRow);

    const hpLabel = document.createElement('span');
    hpLabel.className = 'battle-info-hp-label';
    hpLabel.textContent = 'HP';
    hpRow.appendChild(hpLabel);

    const hpBar = document.createElement('div');
    hpBar.className = 'battle-hp-bar';
    hpRow.appendChild(hpBar);

    const hpFill = document.createElement('div');
    hpFill.className = 'battle-hp-fill';
    hpFill.style.width = '100%';
    hpBar.appendChild(hpFill);

    const hpValue = document.createElement('span');
    hpValue.className = 'battle-hp-value';
    hpValue.textContent = '-- / --';
    content.appendChild(hpValue);

    const status = document.createElement('div');
    status.className = 'battle-status-label';
    status.textContent = 'OK';
    content.appendChild(status);

    return {
        wrapper,
        nameEl,
        levelEl,
        hpFill,
        hpValue,
        status
    };
}

function createMessagePanel(parent) {
    const panel = document.createElement('div');
    panel.className = 'battle-message-panel';
    parent.appendChild(panel);

    const { content } = createDialogueFrame(panel, 'battle-message-shell');
    const textWrapper = document.createElement('div');
    textWrapper.className = 'dialogue-text-area battle-message-area';
    content.appendChild(textWrapper);

    const text = document.createElement('p');
    text.id = 'battle-message-text';
    text.textContent = '¡La batalla está lista!';
    textWrapper.appendChild(text);

    return { panel, text };
}

function createActionPanel(parent) {
    const panel = document.createElement('div');
    panel.className = 'battle-action-panel';
    parent.appendChild(panel);

    const { content } = createDialogueFrame(panel, 'battle-action-shell');

    const actionList = document.createElement('ul');
    actionList.className = 'battle-action-list';
    content.appendChild(actionList);

    const moveList = document.createElement('ul');
    moveList.className = 'battle-move-list hidden';
    content.appendChild(moveList);

    const moveInfo = document.createElement('div');
    moveInfo.className = 'battle-move-info hidden';
    moveInfo.innerHTML = '<span class="label">PP</span><span class="value">--/--</span><span class="type">Tipo --</span>';
    content.appendChild(moveInfo);

    return { panel, actionList, moveList, moveInfo };
}

function clampPercentage(value) {
    if (Number.isNaN(value)) return 0;
    return Math.min(100, Math.max(0, value));
}

function getHpColor(percentage) {
    if (percentage <= 25) return 'low';
    if (percentage <= 50) return 'mid';
    return 'high';
}

export function setupBattleHud() {
    const container = getCanvasContainer();
    if (!container) return null;

    let existing = document.getElementById('battle-overlay');
    if (existing) {
        existing.remove();
    }

    const overlay = document.createElement('div');
    overlay.id = 'battle-overlay';
    overlay.className = 'battle-overlay hidden';
    container.appendChild(overlay);

    const stage = document.createElement('div');
    stage.className = 'battle-stage';
    overlay.appendChild(stage);

    const statusLayer = document.createElement('div');
    statusLayer.className = 'battle-status-layer';
    stage.appendChild(statusLayer);

    const opponentRow = document.createElement('div');
    opponentRow.className = 'battle-status-row top';
    statusLayer.appendChild(opponentRow);

    const playerRow = document.createElement('div');
    playerRow.className = 'battle-status-row bottom';
    statusLayer.appendChild(playerRow);

    const opponentPanel = createPokemonPanel(opponentRow, 'opponent');
    const playerPanel = createPokemonPanel(playerRow, 'player');

    const uiRow = document.createElement('div');
    uiRow.className = 'battle-ui-row';
    overlay.appendChild(uiRow);

    const messagePanel = createMessagePanel(uiRow);
    const actionPanel = createActionPanel(uiRow);

    let actionIndex = 0;
    let moveIndex = 0;
    let actionOptions = [...DEFAULT_ACTION_OPTIONS];
    let moveOptions = [];
    let moveMeta = { pp: '--', type: '--', totalPP: '--' };
    let mode = 'action';

    function show() {
        overlay.classList.remove('hidden');
    }

    function hide() {
        overlay.classList.add('hidden');
    }

    function isVisible() {
        return !overlay.classList.contains('hidden');
    }

    function setMessage(text) {
        messagePanel.text.textContent = text || '';
    }

    function updateHp(panel, current = 0, max = 1) {
        const safeMax = Math.max(1, max);
        const percent = clampPercentage((current / safeMax) * 100);
        panel.hpFill.style.width = `${percent}%`;
        panel.hpFill.dataset.state = getHpColor(percent);
        panel.hpValue.textContent = `${Math.max(0, Math.floor(current))} / ${Math.floor(safeMax)}`;
    }

    function updatePanel(panel, data = {}) {
        panel.nameEl.textContent = data.name ?? '---';
        panel.levelEl.textContent = data.level ? `Lv ${data.level}` : 'Lv --';
        updateHp(panel, data.currentHp ?? data.hp ?? 0, data.maxHp ?? data.hp ?? 1);
        const rawStatus = (data.status ?? 'OK') ?? '';
        const normalizedStatus = String(rawStatus).trim();
        const shouldShowStatus = normalizedStatus && normalizedStatus.toUpperCase() !== 'OK';

        if (shouldShowStatus) {
            panel.status.textContent = normalizedStatus;
            panel.status.dataset.state = normalizedStatus.toLowerCase();
            panel.status.classList.remove('hidden');
        } else {
            panel.status.textContent = '';
            panel.status.dataset.state = 'none';
            panel.status.classList.add('hidden');
        }
    }

    function setPokemonPanels({ player = null, opponent = null } = {}) {
        updatePanel(playerPanel, player ?? {});
        updatePanel(opponentPanel, opponent ?? {});

        if (!player?.showHpNumbers) {
            playerPanel.hpValue.classList.remove('hidden');
        }
        if (opponent?.showHpNumbers === false) {
            opponentPanel.hpValue.classList.add('hidden');
        } else {
            opponentPanel.hpValue.classList.remove('hidden');
        }
    }

    function resetHudState() {
        setMessage('');
        setPokemonPanels({});
        setActionOptions([...DEFAULT_ACTION_OPTIONS], 0);
        setMoveOptions([], 0, { pp: '--', totalPP: '--', type: '--' });
        setMode('action');
    }

    function renderActions(options = DEFAULT_ACTION_OPTIONS) {
        actionOptions = options;
        actionPanel.actionList.innerHTML = '';
        options.forEach((option, idx) => {
            const item = document.createElement('li');
            item.className = `battle-action-option${idx === actionIndex ? ' active' : ''}`;
            item.dataset.id = option.id ?? String(idx);
            item.textContent = option.label ?? option.id ?? `Opción ${idx + 1}`;
            actionPanel.actionList.appendChild(item);
        });
    }

    function renderMoves(moves = []) {
        moveOptions = moves;
        actionPanel.moveList.innerHTML = '';
        moves.forEach((move, idx) => {
            const item = document.createElement('li');
            item.className = `battle-move-option${idx === moveIndex ? ' active' : ''}`;
            item.dataset.id = move.id ?? move.name ?? String(idx);
            item.innerHTML = `
                <span class="battle-move-name">${move.label ?? move.name ?? '---'}</span>
            `;
            actionPanel.moveList.appendChild(item);
        });
    }

    function setActionOptions(options = DEFAULT_ACTION_OPTIONS, selectedIndex = 0) {
        actionIndex = Math.max(0, Math.min(options.length - 1, selectedIndex));
        renderActions(options);
    }

    function setMoveOptions(options = [], selectedIndex = 0, meta = null) {
        moveIndex = Math.max(0, Math.min(options.length - 1, selectedIndex));
        const selected = options[moveIndex] ?? null;
        moveMeta = meta ?? {
            pp: selected?.pp ?? '--',
            totalPP: selected?.totalPP ?? selected?.pp ?? '--',
            type: selected?.type ?? '--'
        };
        renderMoves(options);
        actionPanel.moveInfo.querySelector('.value').textContent = `${moveMeta.pp}/${moveMeta.totalPP}`;
        actionPanel.moveInfo.querySelector('.type').textContent = `Tipo ${moveMeta.type}`;
    }

    function highlightAction(delta) {
        if (!actionOptions.length) return;
        actionIndex = (actionIndex + delta + actionOptions.length) % actionOptions.length;
        setActionOptions(actionOptions, actionIndex);
    }

    function highlightMove(delta) {
        if (!moveOptions.length) return;
        moveIndex = (moveIndex + delta + moveOptions.length) % moveOptions.length;
        setMoveOptions(moveOptions, moveIndex);
    }

    function setMode(nextMode = 'action') {
        mode = nextMode;
        const isMoveMode = mode === 'moves';
        actionPanel.actionList.classList.toggle('hidden', isMoveMode);
        actionPanel.moveList.classList.toggle('hidden', !isMoveMode);
        actionPanel.moveInfo.classList.toggle('hidden', !isMoveMode);
    }

    function getSelection() {
        if (mode === 'moves') {
            return moveOptions[moveIndex] ?? null;
        }
        return actionOptions[actionIndex] ?? null;
    }

    renderActions(actionOptions);
    hide();

    const handleBattleState = (isActive) => {
        if (isActive) {
            show();
        } else {
            resetHudState();
            hide();
        }
    };

    handleBattleState(Boolean(getFlag('isBattleActive')));
    const unsubscribeBattleFlag = onFlagChange('isBattleActive', handleBattleState);

    return {
        show,
        hide,
        isVisible,
        setMessage,
        setPokemonPanels,
        setActionOptions,
        setMoveOptions,
        highlightAction,
        highlightMove,
        setMode,
        getSelection,
        getMode: () => mode,
        element: overlay,
        dispose: () => unsubscribeBattleFlag?.()
    };
}
