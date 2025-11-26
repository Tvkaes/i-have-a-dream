import { loadWorld as loadWorldScene } from '../world/scenes.js';

function getCanvasContainer() {
    return document.getElementById('canvas-container') || document.body;
}

export function setupInteractionOverlay(getScene = () => null, getPlayer = () => null, getPhysics = () => null) {
    const container = getCanvasContainer();
    let overlay = document.getElementById('interaction-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'interaction-overlay';
        container.appendChild(overlay);
    }

    const ensurePanel = (id, className = 'interaction-panel hidden') => {
        let panel = document.getElementById(id);
        if (!panel) {
            panel = document.createElement('div');
            panel.id = id;
            panel.className = className;
            overlay.appendChild(panel);
        } else {
            panel.className = className;
        }
        return panel;
    };

    const promptPanel = ensurePanel('interaction-prompt', 'interaction-panel prompt-panel hidden');
    let promptText = promptPanel.querySelector('p');
    if (!promptText) {
        promptText = document.createElement('p');
        promptPanel.appendChild(promptText);
    }

    const createElement = (tag, className, parent) => {
        const element = document.createElement(tag);
        if (className) element.className = className;
        if (parent) parent.appendChild(element);
        return element;
    };

    let messagePanel = document.getElementById('interaction-message');
    if (!messagePanel) {
        messagePanel = document.createElement('div');
        messagePanel.id = 'interaction-message';
        overlay.appendChild(messagePanel);
    }
    messagePanel.className = 'interaction-panel dialogue-panel hidden';
    if (!messagePanel.querySelector('.dialogue-content')) {
        messagePanel.innerHTML = '';
        const outerBorder = createElement('div', 'dialogue-outer-border', messagePanel);
        const middleBorder = createElement('div', 'dialogue-middle-border', outerBorder);
        const dialogueBox = createElement('div', 'dialogue-box', middleBorder);
        const inner = createElement('div', 'dialogue-inner', dialogueBox);
        createElement('div', 'dialogue-paint-texture', inner);
        ['corner-tl', 'corner-tr', 'corner-bl', 'corner-br'].forEach((cornerClass) => {
            createElement('div', `dialogue-corner ${cornerClass}`, inner);
        });
        const content = createElement('div', 'dialogue-content', inner);
        const header = createElement('div', 'dialogue-character-header', content);
        const portrait = createElement('div', 'dialogue-portrait portrait-empty', header);
        portrait.id = 'interaction-portrait';
        const portraitImage = createElement('img', 'dialogue-portrait-image hidden', portrait);
        portraitImage.id = 'interaction-portrait-image';
        portraitImage.alt = '';
        createElement('div', 'portrait-highlight', portrait);
        const speakerLabel = createElement('div', 'dialogue-character-name', header);
        speakerLabel.id = 'interaction-speaker';
        const textArea = createElement('div', 'dialogue-text-area', content);
        const paragraph = createElement('p', '', textArea);
        paragraph.id = 'interaction-message-text';
        const continuePrompt = createElement('div', 'dialogue-continue hidden', content);
        continuePrompt.id = 'interaction-continue';
        createElement('span', 'continue-arrow', continuePrompt);
        const choicePanel = createElement('div', 'dialogue-choice-panel hidden', content);
        choicePanel.id = 'interaction-choice-panel';
        const choiceList = createElement('ul', 'choice-list', choicePanel);
        choiceList.id = 'interaction-choice-list';
    }

    const messageText = document.getElementById('interaction-message-text');
    const speakerText = document.getElementById('interaction-speaker');
    const continuePrompt = document.getElementById('interaction-continue');
    const portraitElement = document.getElementById('interaction-portrait');
    const portraitImageElement = document.getElementById('interaction-portrait-image');
    const choicePanel = document.getElementById('interaction-choice-panel');
    const choiceList = document.getElementById('interaction-choice-list');

    promptPanel.classList.add('hidden');
    messagePanel.classList.add('hidden');

    let activeMessages = [];
    let messageIndex = 0;
    let activeSpeaker = '';
    let pendingChoices = null;
    let activeChoices = [];
    let choiceIndex = 0;
    let choiceCallback = null;

    const setSpeaker = (value = '') => {
        activeSpeaker = value || '';
        if (speakerText) {
            speakerText.textContent = activeSpeaker;
        }
    };

    const setContinueVisible = (visible) => {
        if (!continuePrompt) return;
        continuePrompt.classList.toggle('hidden', !visible);
    };

    const renderChoices = () => {
        if (!choiceList) return;
        choiceList.innerHTML = '';
        activeChoices.forEach((choice, idx) => {
            const item = document.createElement('li');
            item.className = `choice-option${idx === choiceIndex ? ' active' : ''}`;
            item.textContent = choice.label ?? choice.id ?? `Opción ${idx + 1}`;
            choiceList.appendChild(item);
        });
    };

    const setChoicesVisible = (visible) => {
        if (!choicePanel) return;
        choicePanel.classList.toggle('hidden', !visible);
        if (!visible) {
            choiceList.innerHTML = '';
        }
    };

    const startChoices = (choices = [], callback = null) => {
        if (!Array.isArray(choices) || choices.length === 0) return;
        activeChoices = choices;
        choiceIndex = 0;
        choiceCallback = typeof callback === 'function' ? callback : null;
        setContinueVisible(false);
        renderChoices();
        setChoicesVisible(true);
    };

    const finishChoices = () => {
        setChoicesVisible(false);
        activeChoices = [];
        choiceIndex = 0;
        const callback = choiceCallback;
        choiceCallback = null;
        pendingChoices = null;
        return callback;
    };

    const hasActiveChoices = () => activeChoices.length > 0;

    const queueChoices = (choices, callback) => {
        if (Array.isArray(choices) && choices.length) {
            pendingChoices = { choices, callback };
        } else {
            pendingChoices = null;
        }
    };

    const resolvePortraitSrc = (src = '') => {
        if (!src) return '';
        if (/^https?:\/\//i.test(src) || src.startsWith('data:') || src.startsWith('/')) return src;
        try {
            return new URL(src, window.location.href).toString();
        } catch (err) {
            return src;
        }
    };

    const setPortraitImage = (src = '') => {
        if (!portraitElement || !portraitImageElement) return;

        const clearPortrait = () => {
            portraitElement.classList.add('portrait-empty');
            portraitImageElement.src = '';
            portraitImageElement.classList.add('hidden');
            portraitImageElement.removeAttribute('data-tried-fallback');
        };

        if (!src) {
            clearPortrait();
            return;
        }

        const normalizedSrc = resolvePortraitSrc(src);
        const needsFallbackCandidate = !/^https?:\/\/|^data:|^\//i.test(src);
        const fallbackSrc = needsFallbackCandidate ? resolvePortraitSrc(`public/${src}`) : '';

        portraitImageElement.onload = () => {
            portraitElement.classList.remove('portrait-empty');
            portraitImageElement.classList.remove('hidden');
        };
        portraitImageElement.onerror = () => {
            const triedFallback = portraitImageElement.getAttribute('data-tried-fallback') === 'true';
            if (!triedFallback && fallbackSrc && fallbackSrc !== portraitImageElement.src) {
                portraitImageElement.setAttribute('data-tried-fallback', 'true');
                portraitImageElement.src = fallbackSrc;
                return;
            }
            clearPortrait();
        };

        portraitElement.classList.add('portrait-empty');
        portraitImageElement.classList.add('hidden');
        portraitImageElement.removeAttribute('data-tried-fallback');
        portraitImageElement.src = normalizedSrc;
    };

    const api = {
        showPrompt(text = '') {
            promptText.textContent = text;
            promptPanel.classList.remove('hidden');
        },
        hidePrompt() {
            promptPanel.classList.add('hidden');
        },
        showMessage(text = '', speaker = '', portrait = '') {
            setSpeaker(speaker);
            setPortraitImage(portrait);
            messageText.textContent = text;
            messagePanel.classList.remove('hidden');
            setContinueVisible(true);
        },
        hideMessage() {
            messagePanel.classList.add('hidden');
            activeMessages = [];
            messageIndex = 0;
            setSpeaker('');
            setContinueVisible(false);
            setPortraitImage('');
            setChoicesVisible(false);
            activeChoices = [];
            pendingChoices = null;
            choiceCallback = null;
        },
        hideAll() {
            promptPanel.classList.add('hidden');
            messagePanel.classList.add('hidden');
            activeMessages = [];
            messageIndex = 0;
            setSpeaker('');
            setContinueVisible(false);
            setPortraitImage('');
            setChoicesVisible(false);
            activeChoices = [];
            pendingChoices = null;
            choiceCallback = null;
        },
        isMessageVisible() {
            return !messagePanel.classList.contains('hidden');
        },
        startMessageSequence(messages = [], speaker = '', portrait = '', { choices = null, onSelect = null } = {}) {
            if (!Array.isArray(messages) || messages.length === 0) return;
            activeMessages = messages;
            messageIndex = 0;
            setSpeaker(speaker);
            setPortraitImage(portrait);
            messageText.textContent = messages[0];
            messagePanel.classList.remove('hidden');
            setContinueVisible(true);
            queueChoices(choices, onSelect);
        },
        advanceMessage() {
            if (!activeMessages.length) {
                api.hideMessage();
                api.hidePrompt();
                return;
            }
            messageIndex += 1;
            if (messageIndex >= activeMessages.length) {
                if (pendingChoices) {
                    startChoices(pendingChoices.choices, pendingChoices.callback);
                    return;
                }
                api.hideMessage();
                api.hidePrompt();
                return;
            }
            messageText.textContent = activeMessages[messageIndex];
        },
        isChoiceActive() {
            return hasActiveChoices();
        },
        moveChoice(delta = 0) {
            if (!hasActiveChoices()) return;
            const length = activeChoices.length;
            choiceIndex = (choiceIndex + delta + length) % length;
            renderChoices();
        },
        confirmChoice() {
            if (!hasActiveChoices()) return;
            const selected = activeChoices[choiceIndex];
            const callback = finishChoices();
            api.hideMessage();
            api.hidePrompt();
            if (callback) {
                try {
                    callback(selected);
                } catch (err) {
                    console.warn('Error al manejar la elección:', err);
                }
            }
        },
        shouldLockControls() {
            return api.isMessageVisible() || hasActiveChoices();
        },
        loadWorld(worldId, returnPos = null) {
            const scene = getScene();
            const player = getPlayer();
            const physics = getPhysics();
            if (scene && player) {
                loadWorldScene(worldId, scene, player, null, returnPos, physics);
            }
        }
    };

    return api;
}

export function getInteractionOverlayInstance() {
    return window.__interactionOverlay__;
}
