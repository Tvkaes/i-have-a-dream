import * as THREE from 'three';

function drawSpeechBubble(ctx, text, width, height) {
    ctx.clearRect(0, 0, width, height);
    ctx.save();

    const padding = 18;
    const cornerRadius = 18;
    const bubbleWidth = width - padding * 2;
    const bubbleHeight = height - padding * 2 - 16;
    const startX = padding;
    const startY = padding;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.filter = 'blur(6px)';
    ctx.fillRect(startX + 6, startY + 12, bubbleWidth, bubbleHeight);
    ctx.filter = 'none';

    ctx.beginPath();
    ctx.moveTo(startX + cornerRadius, startY);
    ctx.lineTo(startX + bubbleWidth - cornerRadius, startY);
    ctx.quadraticCurveTo(startX + bubbleWidth, startY, startX + bubbleWidth, startY + cornerRadius);
    ctx.lineTo(startX + bubbleWidth, startY + bubbleHeight - cornerRadius - 12);
    ctx.quadraticCurveTo(
        startX + bubbleWidth,
        startY + bubbleHeight - 12,
        startX + bubbleWidth - cornerRadius,
        startY + bubbleHeight - 12
    );
    ctx.lineTo(startX + bubbleWidth * 0.6, startY + bubbleHeight - 12);
    ctx.lineTo(startX + bubbleWidth * 0.55, startY + bubbleHeight + 12);
    ctx.lineTo(startX + bubbleWidth * 0.45, startY + bubbleHeight - 12);
    ctx.lineTo(startX + cornerRadius, startY + bubbleHeight - 12);
    ctx.quadraticCurveTo(startX, startY + bubbleHeight - 12, startX, startY + bubbleHeight - cornerRadius - 12);
    ctx.lineTo(startX, startY + cornerRadius);
    ctx.quadraticCurveTo(startX, startY, startX + cornerRadius, startY);
    ctx.closePath();

    ctx.fillStyle = '#d8f4ff';
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#3aa9d8';
    ctx.stroke();

    ctx.fillStyle = '#1c2a38';
    ctx.font = '24px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, width / 2, startY + bubbleHeight / 2 - 8);

    ctx.restore();
}

export function createInteractionBubble() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');

    drawSpeechBubble(ctx, 'Interactuar', canvas.width, canvas.height);

    const texture = new THREE.CanvasTexture(canvas);
    texture.anisotropy = 4;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.needsUpdate = true;

    const material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false, depthWrite: false });
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(2.2, 1.1, 1);
    sprite.visible = false;

    let currentText = '';

    return {
        sprite,
        setText(text) {
            const safeText = text || '';
            if (safeText === currentText) return;
            currentText = safeText;
            drawSpeechBubble(ctx, safeText, canvas.width, canvas.height);
            texture.needsUpdate = true;
        },
        setVisible(visible) {
            sprite.visible = visible;
        },
        setPosition(position, offsetY = 1.6) {
            sprite.position.set(position.x, position.y + offsetY, position.z);
        }
    };
}
