// INITIALIZE

import * as THREE from 'https://cdn.skypack.dev/pin/three@v0.135.0-pjGUcRG9Xt70OdXl97VF/mode=imports/optimized/three.js';
import { FirstPersonControls } from 'https://cdn.skypack.dev/three/examples/jsm/controls/FirstPersonControls.js';

import { Sky } from 'https://cdn.skypack.dev/three/examples/jsm/objects/Sky.js'

import { GLTFLoader } from 'https://cdn.skypack.dev/three/examples/jsm/loaders/GLTFLoader.js';


import { GUI } from 'https://cdn.skypack.dev/three/examples/jsm/libs/lil-gui.module.min.js';

//import { Interaction } from 'https://cdn.skypack.dev/pin/three.interaction@v0.2.3-OWhEAGFgFHqRauqtJEO2/mode=imports/optimized/three.interaction.js';

const loader = new GLTFLoader();
const scene = new THREE.Scene(); // init scene
const camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 ); // init camera
const clock = new THREE.Clock();

const CLICK_DISTANCE = 30;
const MODAL_DISTANCE = 5;

// lighting 
(() => {
    const ambient_light = new THREE.AmbientLight(0x404040);
    scene.add(ambient_light);
    const point_light = new THREE.PointLight(0xfefefe, 1, 100);
    point_light.position.set(0, 12, 0);
    scene.add(point_light);
})();
console.log('lights created');

const renderer = (() => {
    const renderer = new THREE.WebGLRenderer({antialias: true}); // init renderer
    document.body.appendChild( renderer.domElement );
    renderer.setSize( window.innerWidth, window.innerHeight );
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.5;
    return renderer;
})();
console.log('renderer created')

const controls = (() => {
    const controls = new FirstPersonControls( camera, renderer.domElement );
    controls.movementSpeed = 10;
    controls.lookSpeed = 0.2;
    controls.enabled = false;
    return controls;
})();
console.log('controls created');

function initSky() {

    // Add Sky
    let sky = new Sky();
    sky.scale.setScalar( 450000 );
    scene.add( sky );

    let sun = new THREE.Vector3();

    /// GUI

    const effectController = {
        turbidity: 10,
        rayleigh: 3,
        mieCoefficient: 0.005,
        mieDirectionalG: 0.7,
        elevation: 2,
        azimuth: 180,
        exposure: renderer.toneMappingExposure
    };

    function guiChanged() {

        const uniforms = sky.material.uniforms;
        uniforms[ 'turbidity' ].value = effectController.turbidity;
        uniforms[ 'rayleigh' ].value = effectController.rayleigh;
        uniforms[ 'mieCoefficient' ].value = effectController.mieCoefficient;
        uniforms[ 'mieDirectionalG' ].value = effectController.mieDirectionalG;

        const phi = THREE.MathUtils.degToRad( 90 - effectController.elevation );
        const theta = THREE.MathUtils.degToRad( effectController.azimuth );

        sun.setFromSphericalCoords( 1, phi, theta );

        uniforms[ 'sunPosition' ].value.copy( sun );

        renderer.toneMappingExposure = effectController.exposure;
        renderer.render( scene, camera );

    }


    guiChanged();

    // init fog particles
    const material = (() => {
        scene.fog = new THREE.FogExp2( '#9babbb', 0.003 );
        const geometry = new THREE.BufferGeometry();
        const vertices = [];

        for ( let i = 0; i < 10000; i ++ ) {

            const x = 3000 * Math.random() - 1000;
            const y = 3000 * Math.random() - 1000;
            const z = 3000 * Math.random() - 1000;

            vertices.push( x, y, z );

        }
        geometry.setAttribute( 'position', new THREE.Float32BufferAttribute( vertices, 3 ) );
        const sprite = new THREE.TextureLoader().load( 'models/dust.png' );


        let material = new THREE.PointsMaterial( { size: 5, sizeAttenuation: true, map: sprite, alphaTest: 0.5, transparent: true } );
        material.color.setHSL( 1.0, 0.3, 0.7 );

        const particles = new THREE.Points( geometry, material );
        scene.add( particles );
        return material;
    })();
    return [ sky, sun, material ];
}
const [ sky, sun, material ] = initSky();
console.log('environment initialized')



// comments
const addComment = () => {
    let message = prompt("ayo what u wanna say", "NONE");
    console.log("adding a comment!");
    const commentMesh = new THREE.Mesh(
	new THREE.BoxGeometry(0.5, 0.5, 0.5),
	new THREE.MeshBasicMaterial({ color: "#faf7bc" }),
    );

    //commentMesh.position.x = camera.position.x 
    //commentMesh.position.y = camera.position.y
    //commentMesh.position.z = camera.position.z
    //camera.add(commentMesh);
    //commentMesh.position.set(0,0,10);
    updatePositionForCamera(camera, commentMesh)


    const commentCube = new ClickableObject(
	commentMesh, () => {console.log(message)}
    )

}

function updatePositionForCamera(camera, obj) {
    // fixed distance from camera to the object
    var dist = 3;
    var cwd = new THREE.Vector3();

    camera.getWorldDirection(cwd);

    cwd.multiplyScalar(dist);
    cwd.add(camera.position);

    obj.position.set(cwd.x, cwd.y, cwd.z);
    obj.setRotationFromQuaternion(camera.quaternion);
}



// MESHES

class ClickableObject {
    constructor(mesh, callback) {
        this.mesh = mesh;
        this.callback = callback;

        scene.add( this.mesh );
        this.mesh.cursor = 'pointer';
        this.mesh.callback = this.callback;
    }
}

const world = await (async () => {
    const world = await new Promise((res, rej) => {
        loader.load('models/untitled.glb', res, undefined, rej);
    });
    world.scene.scale.x = 1;
    world.scene.scale.y = 1;
    world.scene.scale.z = 1;
    world.scene.position.x = 1;
    return world;
})();
//model.scene.children[2].visible = false;
console.log(world.scene.children[2])


const environment = new ClickableObject(
    world.scene.children[2], () => [ console.log("floor clicked") ]
)
environment.mesh.position.y = -1;


const cubemesh = new THREE.Mesh(
    new THREE.BoxGeometry(1, 1, 1),
    new THREE.MeshBasicMaterial({ color: 0xffffff }),
);

const cube = new ClickableObject(
    cubemesh, () => { console.log("cube clilcked") }
)


// events
window.addEventListener('keydown', onDocumentKeyDown, false);
window.addEventListener('keyup', onDocumentKeyUp, false);

let up = false;
let down = false;
function onDocumentKeyDown( e ) {
    if (e.which == 81) {
        up = true;
    } else if (e.which == 69) {
        down = true;
    } else if (e.which == 67) {
	addComment();
    } else if (e.key === 'Shift') {
        controls.enabled = true;
    }
}

function onDocumentKeyUp( e ) {
    if (e.which == 81) {
        up = false;
    } else if (e.which == 69) {
        down = false;
    } else if (e.key === 'Shift') {
        controls.enabled = false;
    }
}

window.addEventListener('click', onDocumentMouseDown, false);
var raycaster = new THREE.Raycaster();
var mouse = new THREE.Vector2();
function onDocumentMouseDown( event ) {
    event.preventDefault();

    mouse.x = ( event.clientX / renderer.domElement.clientWidth ) * 2 - 1;
    mouse.y = - ( event.clientY / renderer.domElement.clientHeight ) * 2 + 1;

    raycaster.setFromCamera( mouse, camera );
    if (!controls.enabled) for (let obj of raycaster.intersectObjects( scene.children )) {
        if (obj.distance < CLICK_DISTANCE && typeof obj.object.callback === 'function') {
            obj.object.callback(event)
            break;
        }
    }
}

document.addEventListener('resize', e => {
    // TODO handle resizes
    console.log('resized!')
    renderer.setSize( window.innerWidth, window.innerHeight );
    controls.handleResize();
});

camera.position.z = 5;
scene.add(camera)

// ANIMATION LOOP

function animate() {
    requestAnimationFrame( animate );
    renderer.setSize( window.innerWidth, window.innerHeight );

    if (up) { camera.position.y += 0.1; }
    if (down) { camera.position.y -= 0.1; }

    //if (fasterTurn) { controls.lookSpeed = 0.3 } else { controls.lookSpeed = 0.1 }
    // event handling

    //cube.rotation.x += 0.01;
    cube.mesh.rotation.y += 0.01;
    //defaultCube.mesh.rotation.y -= 0.01;

    controls.update( clock.getDelta() );
    renderer.render( scene, camera );
}
animate();


