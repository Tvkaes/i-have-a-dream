import * as THREE from 'three';
import { animate, computeAttackContext } from './utils.js';

const BRANCH_POINTS = 14;

function createBoltGeometry(from, to) {
    const points = [];
    const direction = new THREE.Vector3().subVectors(to, from);
    for (let i = 0; i <= BRANCH_POINTS; i += 1) {
        const t = i / BRANCH_POINTS;
        const point = from.clone().add(direction.clone().multiplyScalar(t));
        point.x += (Math.random() - 0.5) * 0.3;
        point.y += Math.sin(t * Math.PI * 2) * 0.2 + (Math.random() - 0.5) * 0.2;
        point.z += (Math.random() - 0.5) * 0.3;
        points.push(point);
    }
    return new THREE.BufferGeometry().setFromPoints(points);
}

function createBoltMaterials() {
    return {
        core: new THREE.LineBasicMaterial({ color: 0xffff66, linewidth: 2, transparent: true, opacity: 0.95 }),
        glow: new THREE.LineBasicMaterial({ color: 0xffffff, linewidth: 3, transparent: true, opacity: 0.4 })
    };
}

export async function playThunderShock({ scene, attackerMesh, defenderMesh }) {
    if (!scene || !attackerMesh || !defenderMesh) return;

    const { attackerPos, defenderPos } = computeAttackContext(attackerMesh, defenderMesh);
    attackerPos.y += 0.6;
    defenderPos.y += 0.7;

    const bolts = [];
    const particles = createElectricParticles(scene, defenderPos);

    await animate(700, ({ t }) => {
        if (Math.random() > 0.8 || bolts.length === 0) {
            spawnBolt(scene, attackerPos, defenderPos, bolts);
        }
        bolts.forEach((bolt) => {
            bolt.main.material.opacity = 0.6 + Math.random() * 0.4;
            bolt.glow.material.opacity = 0.25 + Math.random() * 0.3;
            if (Math.random() > 0.9) {
                bolt.ttl -= 0.2;
            }
        });
        for (let i = bolts.length - 1; i >= 0; i -= 1) {
            bolts[i].ttl -= 0.05;
            if (bolts[i].ttl <= 0) {
                disposeBolt(scene, bolts[i]);
                bolts.splice(i, 1);
            }
        }
        particles.forEach((particle, idx) => {
            particle.angle += particle.speed;
            particle.mesh.position.x = defenderPos.x + Math.cos(particle.angle) * 0.5;
            particle.mesh.position.z = defenderPos.z + Math.sin(particle.angle) * 0.5;
            particle.mesh.position.y = defenderPos.y + Math.sin((t + idx * 0.1) * Math.PI * 4) * 0.2;
            particle.mesh.material.opacity = 0.6 + Math.sin(t * Math.PI * 10) * 0.2;
        });
    });

    bolts.forEach((bolt) => disposeBolt(scene, bolt));
    disposeParticles(scene, particles);
}

function spawnBolt(scene, from, to, bolts) {
    const geometry = createBoltGeometry(from, to);
    const materials = createBoltMaterials();
    const main = new THREE.Line(geometry, materials.core);
    const glow = new THREE.Line(geometry.clone(), materials.glow);
    scene.add(main);
    scene.add(glow);
    bolts.push({ main, glow, ttl: 0.5 });
}

function disposeBolt(scene, bolt) {
    scene.remove(bolt.main);
    scene.remove(bolt.glow);
    bolt.main.geometry?.dispose?.();
    bolt.glow.geometry?.dispose?.();
    bolt.main.material?.dispose?.();
    bolt.glow.material?.dispose?.();
}

function createElectricParticles(scene, center) {
    const particles = [];
    for (let i = 0; i < 24; i += 1) {
        const geometry = new THREE.SphereGeometry(0.05, 6, 6);
        const material = new THREE.MeshBasicMaterial({ color: 0xffff66, transparent: true, opacity: 0.7 });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.copy(center);
        scene.add(mesh);
        particles.push({
            mesh,
            angle: (i / 24) * Math.PI * 2,
            speed: 0.08 + Math.random() * 0.05
        });
    }
    return particles;
}

function disposeParticles(scene, particles) {
    particles.forEach((particle) => {
        scene.remove(particle.mesh);
        particle.mesh.geometry?.dispose?.();
        particle.mesh.material?.dispose?.();
    });
}
