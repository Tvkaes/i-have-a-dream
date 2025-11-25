import * as THREE from 'three';
import { TILE_SIZE } from '../config/index.js';

export const sharedGeometries = {
    plane: new THREE.PlaneGeometry(TILE_SIZE, TILE_SIZE),
    denseTrunk: new THREE.CylinderGeometry(0.15, 0.18, 2, 12),
    denseLeaves: new THREE.SphereGeometry(0.65, 24, 24),
    treeTrunk: new THREE.CylinderGeometry(0.12, 0.14, 1.4, 12),
    treeLeaves: new THREE.SphereGeometry(0.5, 24, 24),
    flowerLarge: new THREE.SphereGeometry(0.12, 12, 12),
    flowerSmall: new THREE.SphereGeometry(0.1, 12, 12),
    fencePost: new THREE.BoxGeometry(0.08, 0.5, 0.08),
    signPost: new THREE.CylinderGeometry(0.05, 0.05, 0.7, 12),
    signBoard: new THREE.BoxGeometry(0.4, 0.25, 0.05),
    mailboxPost: new THREE.CylinderGeometry(0.04, 0.04, 0.5, 12),
    mailboxBox: new THREE.BoxGeometry(0.15, 0.1, 0.25),
    playerBody: new THREE.CylinderGeometry(0.25, 0.3, 0.8, 24),
    playerHead: new THREE.SphereGeometry(0.28, 24, 24),
    playerCap: new THREE.CylinderGeometry(0.3, 0.3, 0.15, 24),
    playerVisor: new THREE.BoxGeometry(0.4, 0.05, 0.25)
};

sharedGeometries.plane.rotateX(-Math.PI / 2);

export const scratch = {
    box: new THREE.Box3(),
    vecA: new THREE.Vector3(),
    vecB: new THREE.Vector3(),
    vecC: new THREE.Vector3()
};
