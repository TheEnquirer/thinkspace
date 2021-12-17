// INITIALIZE

import * as THREE from 'https://cdn.skypack.dev/pin/three@v0.135.0-pjGUcRG9Xt70OdXl97VF/mode=imports/optimized/three.js';
import { FirstPersonControls } from 'https://cdn.skypack.dev/three/examples/jsm/controls/FirstPersonControls.js';

import { Sky } from 'https://cdn.skypack.dev/three/examples/jsm/objects/Sky.js'

import { GLTFLoader } from 'https://cdn.skypack.dev/three/examples/jsm/loaders/GLTFLoader.js';
import { FontLoader } from 'https://cdn.skypack.dev/three/examples/jsm/loaders/FontLoader.js';
import { TextGeometry } from 'https://cdn.skypack.dev/three/examples/jsm/geometries/TextGeometry.js';

import { nanoid } from 'https://cdn.jsdelivr.net/npm/nanoid/nanoid.js';

import { GUI } from 'https://cdn.skypack.dev/three/examples/jsm/libs/lil-gui.module.min.js';

import { addCommentToDb, supabaseClient, Testing } from './database_manager.js';

import 'https://cdn.jsdelivr.net/npm/js-md5@0.7.3/src/md5.min.js';

const loader = new GLTFLoader();
const scene = new THREE.Scene(); // init scene
const clock = new THREE.Clock();

const CLICK_DISTANCE = 30;
const MODAL_DISTANCE = 5;
const MOVE_SPEED = 0.2;

///////////////////////////////////////
//                                   //
//               SCENE               //
//                                   //
///////////////////////////////////////
// camera
const camera = (() => {
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 5;
    scene.add(camera);
    return camera;
})();
// lighting 
(() => {
    const ambient_light = new THREE.AmbientLight(0x404040, 1.5);
    scene.add(ambient_light);
    const point_light = new THREE.PointLight(0xffffff, 1, 100);
    point_light.position.set(0, 12, 0);
    scene.add(point_light);
})();
const renderer = (() => {
    const renderer = new THREE.WebGLRenderer({antialias: true}); // init renderer
    document.body.appendChild( renderer.domElement );
    renderer.setSize( window.innerWidth, window.innerHeight );
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.5;
    return renderer;
})();
const controls = (() => {
    const controls = new FirstPersonControls( camera, renderer.domElement );
    controls.movementSpeed = 10;
    controls.lookSpeed = 0.2;
    controls.enabled = false;
    return controls;
})();

const droid_sans_boldPromise = (async () => {
    const loader = new FontLoader();
    return new Promise((res, rej) => {
        loader.load( 'https://cdn.skypack.dev/three/examples/fonts/droid/droid_sans_bold.typeface.json', res, undefined, rej);
    });
})();

function initSky() {

    // Add Sky
    let sky = new Sky();
    sky.scale.setScalar( 450000 );
    scene.add( sky );

    let sun = new THREE.Vector3();

    // GUI
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
initSky();
let worldPromise = (async () => {
    const world = await new Promise((res, rej) => {
        loader.load('models/untitled.glb', res, undefined, rej);
    });
    world.scene.scale.x = 1;
    world.scene.scale.y = 1;
    world.scene.scale.z = 1;
    world.scene.position.y = -1;
    scene.add(world.scene);
    return world;
})();

const USER = window.localStorage.getItem('username') || prompt("What name would you like to comment with?", await fetch("https://random-word-api.herokuapp.com/word?number=2&swear=0").then(res => res.json()).then(x => x.join(' ')));
window.localStorage.setItem('username', USER);

const world = await worldPromise;
const droid_sans_bold = await droid_sans_boldPromise;
///////////////////////////////////////
//                                   //
//             COMMENTS              //
//                                   //
///////////////////////////////////////
const allComments = {};

function promptForComment() {
    return prompt("Please enter your comment");
}

const getPositionInfrontOfCamera = (camera) => {
    var dist = 3;
    var cwd = new THREE.Vector3();
    camera.getWorldDirection(cwd);
    cwd.multiplyScalar(dist);
    cwd.add(camera.position);
    return [cwd.x, cwd.y, cwd.z];
}

const initializeComment = () => {
    let message = promptForComment();
    if (message === null) return;
    addCommentToDb(USER, message, getPositionInfrontOfCamera(camera), []);
}

supabaseClient
    .from('comments')
    .on('INSERT', payload => {
        allComments[payload.id] = new CommentThread(payload);
    }).subscribe();

supabaseClient
    .from('comments')
    .on('UPDATE', payload => {
        if (active_comment?.dbid === payload.new.id)
            active_comment.beANarcissist();
    }).subscribe();

supabaseClient
    .from('comments')
    .select()
    .then(comments => {
        comments.body.forEach(c => {
            allComments[c.id] = new CommentThread({ new: c });
        });
    });

// MESHES
class Comment {
    constructor(wtfisavnew, parent_thread) {
        this.user = wtfisavnew.user;
        this.text = wtfisavnew.text || "[nothing]";
        this.children = wtfisavnew.children?.map(c => new Comment(c, parent_thread)) || [];
        this.parent_thread = parent_thread;
        this.session_id = nanoid();
    }
    render() {
        // react moment
        setTimeout(() => {
            document.getElementById(`clickhandle-autogen-${this.session_id}`)
                .addEventListener('click', () => {
                    const content = promptForComment();
                    if (content === null) return;
                    this.addReply(USER, content);
                });
        }, 1, { once: true });
        // TODO: make sure event listeners are killed when events are killed, or we will memory leak to all hell
        return `
        <div class="pointer-events-auto select-auto border-red-400">
            <div class="rounded-md p-2" style="background-color: rgba(32, 32, 32, 0.2);">
                <span class="text-gray-200 font-mono">${this.user}</span>
                <span class="text-gray-400 font-mono">said  <a id="clickhandle-autogen-${this.session_id}" class="text-xs">(reply)</a>
                <br>
                <div class="p-4 text-gray-50">
                    ${marked.parse(this.text)}
                </div>
            </div>
            ${
                this.children.length > 0 ? 
        `<details open class="pointer-events-auto select-auto"><summary>${this.children.length} repl${this.children.length > 1 ? 'ies' : 'y'}...</summary>
            <div class="border-red-700 pl-4">
            ${this.children.map(c => c.render()).join('\n')}
            </div>
            </details>
        </div>` : ""
            }
        <br>
        `;
    }
    serialize() {
        return { user: this.user, text: this.text, children: this.children.map(c => c.serialize()) };
    }
    addReply(user, text) {
        this.children.push(new Comment({ user, text, children: [] }, this.parent_thread));
        this.parent_thread.uploadSelf();
    }
}

let active_comment = null;
let clickables = [];    // must implement handleClick(clickevent)
class CommentThread {
    constructor(wtfisav) {
        this.mesh = new THREE.Mesh(
            new THREE.OctahedronBufferGeometry(0.5),
            new THREE.MeshStandardMaterial({ color: "#35FFF8" }),
        );

        this.mesh.position.set(...wtfisav.new.coords);
        this.mesh.rotation.set(0, Math.random() * 10, 0);
        this.mesh.cursor = 'pointer';
        this.mesh.click_parent = this;
        this.dbid = wtfisav.new.id;
        scene.add(this.mesh);

        this.toplevel = new Comment(wtfisav.new, this);

        clickables.push(this);
        console.log('new comment thread created')
    }
    handleClick(_) {
        if (active_comment !== null) return;    // only start displaying a comment if nothing is currently active
        console.log('currently', active_comment)
        active_comment = this;
        geofence_manager.updateTarget(null);
        this.beANarcissist();
        document.getElementsByTagName('canvas')[0]  // get the threejs canvas
            .addEventListener('click', this.blur, { once: true });
    }
    beANarcissist() {
        modal_manager.setHTML(this.toplevel.render());
    }
    blur() {
        modal_manager.clear();
        setTimeout(() => { active_comment = null; }, 1);    // TODO: scuffed as hell: delay to ensure active comment null check in handleClick goes through, to disable jumping from one comment to another directly
    }
    uploadSelf() {
        const children = this.toplevel.serialize().children;
        supabaseClient
            .from('comments')
            .update({ children: children })
            .match({ id: this.dbid })
            .then().catch(console.error);
    }
}

const geofenced = (() => {
    const nodes = [
        { x: 1, y: 1, size: 1, label: "the world turned upside down", content: "# the world turned upside down\n\n1. thing one\n1. thing two\n 1. *thing 3*" },
        { x: 2, y: 5, size: 1, label: "the drinking song they're singing", content: "# ayooooo\n\n1. thing one\n1. thing two\n 1. *thing 3*" },
        { x: 8, y: 2, size: 2, label: "ayo civil war", content: "# civil war time\n\n1. thing one\n1. thing two\n 1. *thing 3*" }
    ]

    const font_geometry = new TextGeometry( 'Hello three.js!', {
		font: droid_sans_bold,
		size: 0.2,
		height: 0.01,
		curveSegments: 12,
	} );
    const font_mesh = new THREE.Mesh(font_geometry, new THREE.MeshStandardMaterial({ color: 0x3333dd }));
    scene.add( font_mesh )

    let geofenced = nodes.map(n => ({
        mesh: new THREE.Mesh(
            new THREE.BoxBufferGeometry(n.size, n.size, n.size),
            new THREE.MeshStandardMaterial({ color: 0xcccccc }),
        ),
        content: n.content,
        data: n
    }));

    for (let n of geofenced) {
        n.mesh.position.x = n.data.x;
        n.mesh.position.z = n.data.y;
        n.mesh.position.y = 1;
        scene.add( n.mesh );
    };

    return geofenced;
})();
//console.log(geofenced);

// events
window.addEventListener('keydown', onDocumentKeyDown, false);
window.addEventListener('keyup', onDocumentKeyUp, false);

let up = false;
let down = false;
let manual_move = true;
let moving = [0, 0, 0, 0]
function onDocumentKeyDown( e ) {
    if (e.which == 81) {
        up = true;
    } else if (e.which == 69) {
        down = true;
    } else if (e.which == 67) {
	initializeComment();
    } else if (e.key === 'Shift') {
        controls.enabled = true;
	manual_move = false;
    } else if (e.which == 87) {
	moving[0] = 1;
    } else if (e.which == 65) {
	moving[1] = 1;
    } else if (e.which == 83) {
	moving[2] = 1;
    } else if (e.which == 68) {
	moving[3] = 1;
    } else if (e.which == 84) { // testing!
	Testing();
    }
}

function onDocumentKeyUp( e ) {
    if (e.which == 81) {
        up = false;
    } else if (e.which == 69) {
        down = false;
    } else if (e.key === 'Shift') {
        controls.enabled = false;
	manual_move = true;
    } else if (e.which == 87) {
	moving[0] = 0;
    } else if (e.which == 65) {
	moving[1] = 0;
    } else if (e.which == 83) {
	moving[2] = 0;
    } else if (e.which == 68) {
	moving[3] = 0;
    }
};

let hovered_object = null;
function updateHoveredObject(all_objs=scene.children) {
    hovered_object = null;
    raycaster.setFromCamera( mouse, camera );
    for (let obj of raycaster.intersectObjects( all_objs )) {
        if (obj.distance < CLICK_DISTANCE && typeof obj.object.hasOwnProperty('click_parent')) {
            hovered_object = obj;
            break;
        }
    }
}

document.getElementsByTagName('canvas')[0].addEventListener('click', onDocumentMouseDown, false);
var raycaster = new THREE.Raycaster();
var mouse = new THREE.Vector2();
function onDocumentMouseDown( event ) {
    event.preventDefault();

    mouse.x = ( event.clientX / renderer.domElement.clientWidth ) * 2 - 1;
    mouse.y = - ( event.clientY / renderer.domElement.clientHeight ) * 2 + 1;

    updateHoveredObject(clickables.map(o => o.mesh));
    if (hovered_object !== null && !controls.enabled) {
        hovered_object.object.click_parent.handleClick(event);
    }
}

document.addEventListener('resize', e => {
    // TODO handle resizes
    console.log('resized!')
    renderer.setSize( window.innerWidth, window.innerHeight );
    controls.handleResize();
});

class ModalManager {
    constructor() {
        this.sidebar = document.getElementById('sidebar');
    }
    setHTML(html) {
        this.sidebar.style.display = 'block';
        if (html == this.sidebar.innerHTML) return;
        this.sidebar.innerHTML = html;
    }
    clear() {
        this.sidebar.style.display = 'none';
    }
}
const modal_manager = new ModalManager();

class GeofencedModalManager {
    constructor() {
        this.sidebar = document.getElementById('sidebar');
        this.target = null;
    }
    updateTarget(obj) {
        if (obj === this.target) return;
        // TODO: cant get glowing working
        if (this.target !== null) {
            this.target.mesh.material.color.setHex(0xcccccc);
            this.target.mesh.position.y = 1;
        }
        if (active_comment !== null) return;    // get overriden by active comment
        this.target = obj;
        if (this.target !== null) this.target.mesh.material.color.setHex(0x3333dd);
        this.updateContent();
    }
    updateContent(content = null) {
        if (active_comment !== null) return;
        if (this.target === null) {
            modal_manager.clear();
        } else {
            if (content !== null) this.target.content = content;
            modal_manager.setHTML(marked.parse(this.target.content));
        }
    }
}
const geofence_manager = new GeofencedModalManager;

// ANIMATION LOOP
function animate(timestamp) {
    requestAnimationFrame( animate );
    renderer.setSize( window.innerWidth, window.innerHeight );

    if (up) { camera.position.y += 0.1; }
    if (down) { camera.position.y -= 0.1; }
    if (manual_move) {
        if (moving[0]) { camera.translateZ( -MOVE_SPEED ) }
        if (moving[1]) { camera.translateX( -MOVE_SPEED ) }
        if (moving[2]) { camera.translateZ(  MOVE_SPEED ) }
        if (moving[3]) { camera.translateX(  MOVE_SPEED ) }
    }

    for (const c of Object.values(allComments)) {
        c.mesh.rotation.y += 0.0025
        //console.log(i)
    }

    // spin all modal cubes
    for (let n of geofenced) {
        n.mesh.rotation.y += 0.005;
    }

    // highlight nearest modal object
    // TODO: is there a better way of finding the nearest object?
    (() => {
        let min_dist = null;
        let nearest = null;
        for (let obj of geofenced) {
            const cam_dist = new THREE.Vector3();
            const dist = cam_dist.subVectors(camera.position, obj.mesh.position).length();
            if (min_dist === null || dist < min_dist) {
                min_dist = dist;
                nearest = obj;
            }
        }
        if (active_comment === null) {
            if (nearest !== null && min_dist <= MODAL_DISTANCE) {
                nearest.mesh.rotation.y += 0.01
                nearest.mesh.position.y += Math.sin(timestamp/500)/100;
                geofence_manager.updateTarget(nearest);
            } else {
                geofence_manager.updateTarget(null);
            }
        }
    })();

    updateHoveredObject();

    controls.update( clock.getDelta() );
    renderer.render( scene, camera );
}
animate();

