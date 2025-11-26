const DEFAULT_MESSAGE = 'Cargando...';

function getCanvasContainer() {
    return document.getElementById('canvas-container') || document.body;
}

export function setupLoadingScreen() {
    const container = getCanvasContainer();

    let screen = document.getElementById('loading-screen');
    if (!screen) {
        screen = document.createElement('div');
        screen.id = 'loading-screen';
        screen.style.position = 'fixed';
        screen.style.inset = '0';
        screen.style.display = 'flex';
        screen.style.flexDirection = 'column';
        screen.style.alignItems = 'center';
        screen.style.justifyContent = 'center';
        screen.style.background = 'rgba(8, 8, 15, 0.9)';
        screen.style.backdropFilter = 'blur(3px)';
        screen.style.color = '#fefefe';
        screen.style.fontFamily = 'monospace';
        screen.style.fontSize = '1.2rem';
        screen.style.letterSpacing = '0.1em';
        screen.style.textTransform = 'uppercase';
        screen.style.zIndex = '9999';
        screen.style.transition = 'opacity 0.3s ease';
        screen.style.opacity = '0';
        screen.style.display = 'none';

        const spinner = document.createElement('div');
        spinner.style.width = '48px';
        spinner.style.height = '48px';
        spinner.style.border = '4px solid rgba(255,255,255,0.2)';
        spinner.style.borderTopColor = '#ffffff';
        spinner.style.borderRadius = '50%';
        spinner.style.marginBottom = '18px';
        spinner.style.animation = 'loading-spin 1s linear infinite';
        screen.appendChild(spinner);

        const message = document.createElement('p');
        message.id = 'loading-screen-text';
        message.textContent = DEFAULT_MESSAGE;
        screen.appendChild(message);

        const style = document.createElement('style');
        style.textContent = `@keyframes loading-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`;
        document.head.appendChild(style);

        container.appendChild(screen);
    }

    const messageElement = screen.querySelector('#loading-screen-text');
    let counter = 0;

    const api = {
        show(message = DEFAULT_MESSAGE) {
            counter += 1;
            if (messageElement) {
                messageElement.textContent = message;
            }
            if (screen.style.display !== 'flex') {
                screen.style.display = 'flex';
            }
            requestAnimationFrame(() => {
                screen.style.opacity = '1';
            });
        },
        hide() {
            counter = Math.max(0, counter - 1);
            if (counter === 0) {
                screen.style.opacity = '0';
                setTimeout(() => {
                    if (counter === 0) {
                        screen.style.display = 'none';
                    }
                }, 300);
            }
        },
        isVisible() {
            return counter > 0;
        }
    };

    return api;
}
