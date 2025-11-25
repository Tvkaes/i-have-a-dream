import * as THREE from 'three';

export function createHandPaintedPostProcess(renderer) {
    const uniforms = {
        tDiffuse: { value: null },
        resolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
        brushIntensity: { value: 0.6 },
        saturation: { value: 1.3 },
        outlineStrength: { value: 1.5 },
        posterizeLevels: { value: 8.0 },
        strokeSize: { value: 3.0 },
        time: { value: 0 }
    };

    const material = new THREE.ShaderMaterial({
        uniforms,
        vertexShader: `
            varying vec2 vUv;
            void main() {
                vUv = uv;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            uniform sampler2D tDiffuse;
            uniform vec2 resolution;
            uniform float brushIntensity;
            uniform float saturation;
            uniform float outlineStrength;
            uniform float posterizeLevels;
            uniform float strokeSize;
            uniform float time;
            varying vec2 vUv;

            float hash(vec2 p) {
                return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
            }

            float noise(vec2 p) {
                vec2 i = floor(p);
                vec2 f = fract(p);
                f = f * f * (3.0 - 2.0 * f);

                float a = hash(i);
                float b = hash(i + vec2(1.0, 0.0));
                float c = hash(i + vec2(0.0, 1.0));
                float d = hash(i + vec2(1.0, 1.0));

                return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
            }

            float getEdge() {
                vec2 texel = 1.0 / resolution;

                float tl = length(texture2D(tDiffuse, vUv + vec2(-texel.x, texel.y)).rgb);
                float t = length(texture2D(tDiffuse, vUv + vec2(0.0, texel.y)).rgb);
                float tr = length(texture2D(tDiffuse, vUv + vec2(texel.x, texel.y)).rgb);
                float l = length(texture2D(tDiffuse, vUv + vec2(-texel.x, 0.0)).rgb);
                float r = length(texture2D(tDiffuse, vUv + vec2(texel.x, 0.0)).rgb);
                float bl = length(texture2D(tDiffuse, vUv + vec2(-texel.x, -texel.y)).rgb);
                float b = length(texture2D(tDiffuse, vUv + vec2(0.0, -texel.y)).rgb);
                float br = length(texture2D(tDiffuse, vUv + vec2(texel.x, -texel.y)).rgb);

                float gx = -tl - 2.0 * l - bl + tr + 2.0 * r + br;
                float gy = tl + 2.0 * t + tr - bl - 2.0 * b - br;

                return length(vec2(gx, gy));
            }

            vec3 adjustSaturation(vec3 color, float sat) {
                float gray = dot(color, vec3(0.299, 0.587, 0.114));
                return mix(vec3(gray), color, sat);
            }

            vec3 posterize(vec3 color, float levels) {
                return floor(color * levels) / levels;
            }

            void main() {
                vec2 uv = vUv;

                vec3 color = texture2D(tDiffuse, uv).rgb;

                vec2 brushUV = uv * resolution / strokeSize + time * 0.1;
                float brush1 = noise(brushUV * 2.0);
                float brush2 = noise(brushUV * 4.0 + vec2(5.2, 1.3));
                float brushPattern = mix(brush1, brush2, 0.5);
                color = mix(color, color * (0.8 + brushPattern * 0.4), brushIntensity);

                color = adjustSaturation(color, saturation);
                color = posterize(color, posterizeLevels);

                float edge = getEdge();
                vec3 outlineColor = vec3(0.22, 0.13, 0.05);
                float outlineFactor = min(1.0, edge * outlineStrength * 0.45);
                color = mix(color, outlineColor, outlineFactor);

                float variation = noise(uv * 50.0 + time * 0.05) * 0.05;
                color += variation;

                vec2 vignetteUV = uv * 2.0 - 1.0;
                float vignette = 1.0 - dot(vignetteUV, vignetteUV) * 0.05;
                color = mix(color, color * vignette, 0.7);

                color = mix(color, vec3(1.0), 0.18);
                color *= 1.05;

                gl_FragColor = vec4(color, 1.0);
            }
        `
    });

    const postScene = new THREE.Scene();
    const postCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
    postScene.add(quad);

    const renderTarget = new THREE.WebGLRenderTarget(window.innerWidth, window.innerHeight, {
        minFilter: THREE.LinearFilter,
        magFilter: THREE.LinearFilter,
        format: THREE.RGBAFormat
    });

    return {
        renderTarget,
        material,
        scene: postScene,
        camera: postCamera,
        enabled: false,
        setSize: (width, height) => {
            renderTarget.setSize(width, height);
            uniforms.resolution.value.set(width, height);
        },
        render: (scene, camera, elapsed) => {
            if (!material || !renderTarget) return;
            renderer.setRenderTarget(renderTarget);
            renderer.render(scene, camera);
            material.uniforms.tDiffuse.value = renderTarget.texture;
            material.uniforms.time.value = elapsed;
            renderer.setRenderTarget(null);
            renderer.render(postScene, postCamera);
        }
    };
}
