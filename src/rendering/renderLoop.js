import * as THREE from 'three';
import { updatePlayer, updateCamera } from '../player/index.js';
import { getTreeInstances, getInteractables } from '../world/index.js';
import { getCurrentWorldId } from '../world/scenes.js';

const PHYSICS_IDLE_STEP_INTERVAL = 0.5;

function cullTreesNearCamera(camera, treeInstances, culledMap) {
    const cameraPos = camera.position;
    const cullRadius = 3.5;
    const cullRadiusSq = cullRadius * cullRadius;

    treeInstances.forEach((tree) => {
        const pos = tree.position;
        const distSq = (pos.x - cameraPos.x) ** 2 + (pos.z - cameraPos.z) ** 2;
        const shouldHide = distSq < cullRadiusSq;
        const wasCulled = culledMap.get(tree);

        if (shouldHide !== wasCulled) {
            tree.visible = !shouldHide;
            culledMap.set(tree, shouldHide);
        }
    });
}

export function updateInteractionIndicators({
    player,
    camera,
    input,
    overlay,
    tmpVector,
    tmpForward,
    activeInteractable
}) {
    // Filtrar interactables por el mundo actual
    const currentWorld = getCurrentWorldId();
    const interactables = getInteractables(currentWorld);
    let closest = null;
    let closestDistance = Infinity;

    interactables.forEach((obj) => {
        if (!obj.position || !obj.radius) return;
        tmpVector.copy(obj.position);
        tmpVector.y = player.position.y;
        const dist = tmpVector.distanceTo(player.position);
        if (dist <= obj.radius && dist < closestDistance) {
            tmpForward.set(0, 0, -1).applyQuaternion(player.quaternion);
            tmpForward.y = 0;
            if (tmpForward.lengthSq() < 1e-5) return;
            tmpForward.normalize();
            const direction = tmpVector.clone().sub(player.position);
            direction.y = 0;
            if (direction.lengthSq() < 1e-4) {
                closest = obj;
                closestDistance = dist;
                return;
            }
            direction.normalize();
            const alignment = tmpForward.dot(direction);
            if (alignment >= 0.35) {
                closest = obj;
                closestDistance = dist;
            }
        }
    });

    if (closest !== activeInteractable) {
        if (activeInteractable && !overlay.isMessageVisible()) {
            overlay.hidePrompt();
        }
        if (closest && !overlay.isMessageVisible()) {
            overlay.showPrompt(closest.prompt || 'Presiona Enter para interactuar');
        }
    }

    if (closest && !overlay.isMessageVisible() && input.consumePressed('enter')) {
        overlay.hidePrompt();
        const messages = closest.messages || closest.message || [];
        if (Array.isArray(messages) && messages.length > 0) {
            const choices = closest.choices || null;
            const onSelect = closest.onChoiceSelect
                ? (choice) => {
                    if (typeof closest.onChoiceSelect === 'function') {
                        closest.onChoiceSelect(choice, closest);
                    }
                }
                : null;
            overlay.startMessageSequence(
                messages,
                closest.speaker || '',
                closest.portrait || '',
                { choices, onSelect }
            );
        } else if (typeof closest.onInteract === 'function') {
            closest.onInteract(closest);
        }
    } else if (overlay.isMessageVisible() && !overlay.isChoiceActive()) {
        if (input.consumePressed('enter')) {
            overlay.advanceMessage();
        }
    }

    if (overlay.isChoiceActive()) {
        if (input.consumePressed('arrowup') || input.consumePressed('w')) {
            overlay.moveChoice(-1);
        }
        if (input.consumePressed('arrowdown') || input.consumePressed('s')) {
            overlay.moveChoice(1);
        }
        if (input.consumePressed('enter')) {
            overlay.confirmChoice();
        }
    }

    return { interactable: closest };
}

export function startRenderLoop({
    renderer,
    scene,
    cameraContext,
    player,
    input,
    playerState,
    physics,
    physicsManager,
    clock,
    handPaintedFX,
    interactionOverlay
}) {
    const { camera, cameraTarget, lookTarget, offset } = cameraContext;
    camera.layers.set(0);

    const culledTrees = new WeakMap();
    const tmpVector = new THREE.Vector3();
    const tmpForward = new THREE.Vector3();
    let activeInteractable = null;
    let physicsIdleTimer = 0;

    const loop = () => {
        const delta = clock.getDelta();
        const elapsed = clock.getElapsedTime();
        const controlsLocked = interactionOverlay?.shouldLockControls?.() ?? false;
        const playerActive = controlsLocked ? false : updatePlayer(delta, player, input, playerState, physics);

        if (physicsManager) {
            if (playerActive) {
                physicsIdleTimer = 0;
                physicsManager.step();
                physicsManager.syncPlayer(player);
            } else {
                physicsIdleTimer += delta;
                if (physicsIdleTimer >= PHYSICS_IDLE_STEP_INTERVAL) {
                    physicsManager.step();
                    physicsManager.syncPlayer(player);
                    physicsIdleTimer = 0;
                }
            }
        }
        updateCamera(delta, camera, player, offset, cameraTarget, lookTarget);
        cullTreesNearCamera(camera, getTreeInstances(), culledTrees);
        const { interactable } = updateInteractionIndicators({
            player,
            camera,
            input,
            overlay: interactionOverlay,
            tmpVector,
            tmpForward,
            activeInteractable
        });
        activeInteractable = interactable;
        if (handPaintedFX?.enabled) {
            handPaintedFX.render(scene, camera, elapsed);
        } else {
            renderer.render(scene, camera);
        }
    };

    renderer.setAnimationLoop(loop);

    return () => {
        renderer.setAnimationLoop(null);
    };
}
