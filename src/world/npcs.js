import * as THREE from 'three';

export function createKidNPC() {
    const group = new THREE.Group();
    group.name = 'KidNPC';

    const body = new THREE.Mesh(
        new THREE.BoxGeometry(0.6, 1.2, 0.3),
        new THREE.MeshStandardMaterial({ color: 0xff8c69 })
    );
    body.position.y = 0.6;
    body.castShadow = true;
    group.add(body);

    const head = new THREE.Mesh(
        new THREE.SphereGeometry(0.25, 16, 16),
        new THREE.MeshStandardMaterial({ color: 0xffddb0 })
    );
    head.position.y = 1.35;
    head.castShadow = true;
    group.add(head);

    const cap = new THREE.Mesh(
        new THREE.ConeGeometry(0.3, 0.25, 16),
        new THREE.MeshStandardMaterial({ color: 0x3366ff })
    );
    cap.rotation.x = Math.PI;
    cap.position.y = 1.55;
    cap.castShadow = true;
    group.add(cap);

    return group;
}
