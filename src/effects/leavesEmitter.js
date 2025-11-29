import * as THREE from 'three';

const LEAF_TEXTURE_NAMES = ['leaf.webp', 'leaf2.webp', 'leaf3.webp'];

export class LeavesEmitter {
    constructor(scene, options = {}) {
        if (!scene) {
            throw new Error('LeavesEmitter requiere una referencia a la escena.');
        }

        const {
            count = 120,
            areaSize = new THREE.Vector2(20, 20),
            spawnHeight = 6,
            groundY = 0,
            origin = new THREE.Vector3(),
            leafSize = new THREE.Vector2(0.25, 0.45),
            windStrength = 0.35,
            windFrequency = 0.3,
            rotationTiltSpeed = 1.2,
            settleLifetime = new THREE.Vector2(5, 12),
            settleDriftStrength = 0.15,
            playerInfluenceRadius = 1.8,
            playerInfluenceStrength = 0.35
        } = options;

        this.scene = scene;
        this.count = count;
        this.areaSize = areaSize;
        this.spawnHeight = spawnHeight;
        this.groundY = groundY;
        this.origin = origin.clone();
        this.windStrength = windStrength;
        this.windFrequency = windFrequency;
        this.rotationTiltSpeed = rotationTiltSpeed;
        this.settleLifetime = settleLifetime;
        this.settleDriftStrength = settleDriftStrength;
        this.playerInfluenceRadius = playerInfluenceRadius;
        this.playerInfluenceRadiusSq = playerInfluenceRadius ** 2;
        this.playerInfluenceStrength = playerInfluenceStrength;
        this.enabled = true;

        this.positions = Array.from({ length: count }, () => new THREE.Vector3());
        this.velocities = Array.from({ length: count }, () => new THREE.Vector3());
        this.windOffsets = new Float32Array(count);
        this.rotationSpeeds = new Float32Array(count);
        this.fallAngleOffsets = new Float32Array(count);
        this.tiltAxes = Array.from({ length: count }, () => new THREE.Vector3());
        this.isSettled = new Array(count).fill(false);
        this.settleTimers = new Float32Array(count);
        this.settledYaw = new Float32Array(count);
        this.meshAssignments = new Array(count);
        this.instanceIndices = new Array(count);

        const geometry = new THREE.PlaneGeometry(leafSize.x, leafSize.y);
        const textureLoader = new THREE.TextureLoader();
        this.textures = LEAF_TEXTURE_NAMES.map((name) => {
            const url = new URL(`../../public/three/${name}`, import.meta.url).href;
            const tex = textureLoader.load(url);
            tex.encoding = THREE.sRGBEncoding;
            tex.anisotropy = 4;
            tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
            return tex;
        });
        if (!this.textures.length) {
            this.textures.push(null);
        }

        const textureCount = this.textures.length;
        const basePerTexture = Math.floor(count / textureCount);
        const remainder = count % textureCount;

        this.meshEntries = [];
        let particleCursor = 0;
        this.textures.forEach((tex, texIndex) => {
            const particleCount = basePerTexture + (texIndex < remainder ? 1 : 0);
            if (particleCount <= 0) return;
            const material = new THREE.MeshBasicMaterial({
                color: tex ? 0xffffff : 0xe9c46a,
                map: tex ?? null,
                transparent: true,
                opacity: 0.95,
                side: THREE.DoubleSide,
                depthWrite: false
            });
            const mesh = new THREE.InstancedMesh(geometry, material, particleCount);
            mesh.name = `LeavesEmitter_${texIndex}`;
            mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
            this.scene.add(mesh);
            const entry = { mesh, capacity: particleCount };
            this.meshEntries.push(entry);

            for (let instance = 0; instance < particleCount && particleCursor < this.count; instance += 1) {
                this.meshAssignments[particleCursor] = entry;
                this.instanceIndices[particleCursor] = instance;
                particleCursor += 1;
            }
        });

        this.tmpMatrix = new THREE.Matrix4();
        this.tmpQuaternion = new THREE.Quaternion();
        this.tmpEuler = new THREE.Euler();
        this.tmpInfluence = new THREE.Vector3();
        this.playerPositionCopy = new THREE.Vector3();
        this.playerMotion = new THREE.Vector3();
        this.playerLastPosition = null;

        for (let i = 0; i < count; i += 1) {
            this.resetLeaf(i, true);
        }
    }

    resetLeaf(index, initial = false) {
        this.isSettled[index] = false;
        this.settleTimers[index] = 0;
        this.settledYaw[index] = 0;

        const pos = this.positions[index];
        pos.set(
            this.origin.x + THREE.MathUtils.randFloatSpread(this.areaSize.x),
            this.origin.y + (initial ? Math.random() * this.spawnHeight : this.spawnHeight + Math.random() * this.spawnHeight * 0.5),
            this.origin.z + THREE.MathUtils.randFloatSpread(this.areaSize.y)
        );

        const vel = this.velocities[index];
        vel.set(
            THREE.MathUtils.randFloatSpread(0.1),
            -THREE.MathUtils.randFloat(0.4, 0.8),
            THREE.MathUtils.randFloatSpread(0.1)
        );

        this.windOffsets[index] = Math.random() * Math.PI * 2;
        this.rotationSpeeds[index] = THREE.MathUtils.randFloat(-1.5, 1.5);
        this.fallAngleOffsets[index] = Math.random() * Math.PI * 2;
        const axis = this.tiltAxes[index];
        axis.set(THREE.MathUtils.randFloatSpread(1), THREE.MathUtils.randFloatSpread(0.4), THREE.MathUtils.randFloatSpread(1));
        if (axis.lengthSq() < 1e-3) {
            axis.set(0.3, 0.7, -0.2);
        }
        axis.normalize();
        this.updateInstanceMatrix(index);
    }

    update(delta, elapsed = 0, context = {}) {
        if (!delta || !this.enabled) return;
        this.preparePlayerContext(context.playerPosition);

        for (let i = 0; i < this.count; i += 1) {
            if (this.isSettled[i]) {
                continue;
            }
            const pos = this.positions[i];
            const vel = this.velocities[i];
            const windPhase = this.windOffsets[i] + elapsed * this.windFrequency;
            const windFactor = Math.sin(windPhase) * this.windStrength;

            vel.x = THREE.MathUtils.lerp(vel.x, windFactor, 0.5 * delta);
            vel.z = THREE.MathUtils.lerp(vel.z, windFactor * 0.3, 0.5 * delta);
            pos.addScaledVector(vel, delta);
            pos.y += Math.sin((elapsed + i) * 0.5) * 0.02;

            this.applyPlayerInfluence(i, delta);

            if (pos.y <= this.groundY) {
                pos.y = this.groundY;
                this.settleLeaf(i, elapsed);
                continue;
            }
            this.updateInstanceMatrix(i, elapsed);
        }

        for (let i = 0; i < this.count; i += 1) {
            if (!this.isSettled[i]) continue;
            this.settleTimers[i] -= delta;
            const pos = this.positions[i];
            const windPhase = this.windOffsets[i] + elapsed * this.windFrequency;
            const drift = Math.sin(windPhase) * this.settleDriftStrength * 0.25;
            pos.x += drift * delta;
            pos.z += drift * 0.3 * delta;
            pos.y = this.groundY;
            this.applyPlayerInfluence(i, delta, true);
            if (this.settleTimers[i] <= 0) {
                this.resetLeaf(i);
            } else {
                this.updateInstanceMatrix(i, elapsed);
            }
        }
    }

    settleLeaf(index, elapsed = 0) {
        this.isSettled[index] = true;
        this.settleTimers[index] = THREE.MathUtils.randFloat(this.settleLifetime.x, this.settleLifetime.y);
        const pos = this.positions[index];
        pos.y = this.groundY;
        this.velocities[index].setScalar(0);
        this.rotationSpeeds[index] = 0;
        this.fallAngleOffsets[index] = 0;
        this.settledYaw[index] = Math.random() * Math.PI * 2;
        this.updateInstanceMatrix(index, elapsed);
    }

    updateInstanceMatrix(index, elapsed = 0) {
        const pos = this.positions[index];
        if (this.isSettled[index]) {
            this.tmpEuler.set(-Math.PI / 2, this.settledYaw[index], 0);
            this.tmpMatrix.makeRotationFromEuler(this.tmpEuler);
        } else {
            const angle = (elapsed * this.rotationTiltSpeed + this.fallAngleOffsets[index]) % (Math.PI * 2);
            this.tmpQuaternion.setFromAxisAngle(this.tiltAxes[index], angle);
            this.tmpMatrix.makeRotationFromQuaternion(this.tmpQuaternion);
        }
        this.tmpMatrix.setPosition(pos);
        const entry = this.meshAssignments[index];
        if (!entry) return;
        const mesh = entry.mesh;
        const instance = this.instanceIndices[index] ?? 0;
        mesh.setMatrixAt(instance, this.tmpMatrix);
        mesh.instanceMatrix.needsUpdate = true;
    }

    preparePlayerContext(playerPosition = null) {
        if (!playerPosition) {
            this.playerPositionCopy.setScalar(0);
            this.playerMotion.multiplyScalar(0.8);
            return;
        }
        if (!this.playerLastPosition) {
            this.playerLastPosition = playerPosition.clone();
        }
        this.playerPositionCopy.copy(playerPosition);
        this.playerMotion.copy(playerPosition).sub(this.playerLastPosition);
        this.playerMotion.multiplyScalar(this.playerInfluenceStrength);
        this.playerLastPosition.copy(playerPosition);
    }

    applyPlayerInfluence(index, delta, settled = false) {
        if (!this.playerLastPosition) return;
        const pos = this.positions[index];
        const distanceSq = pos.distanceToSquared(this.playerPositionCopy);
        if (distanceSq > this.playerInfluenceRadiusSq) return;
        const influence = 1 - Math.min(1, Math.sqrt(distanceSq) / this.playerInfluenceRadius);
        this.tmpInfluence.copy(this.playerMotion).multiplyScalar(influence * (settled ? 1.2 : 0.8));
        pos.add(this.tmpInfluence);
        if (settled) {
            pos.y = this.groundY;
        } else {
            this.velocities[index].addScaledVector(this.tmpInfluence, 0.5 / Math.max(delta, 0.016));
        }
    }

    dispose() {
        this.enabled = false;
        this.meshAssignments = [];
        this.instanceIndices = [];
        this.meshEntries?.forEach(({ mesh }) => {
            this.scene?.remove(mesh);
            mesh?.geometry?.dispose?.();
            mesh?.material?.dispose?.();
        });
        this.textures?.forEach((tex) => tex?.dispose?.());
        this.meshEntries = [];
    }

    setEnabled(enabled) {
        const next = Boolean(enabled);
        if (this.enabled === next) return;
        this.enabled = next;
        this.meshEntries?.forEach(({ mesh }) => {
            if (mesh) {
                mesh.visible = next;
            }
        });
    }
}
