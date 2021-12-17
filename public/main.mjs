// INITIALIZE

import * as THREE from 'https://cdn.skypack.dev/pin/three@v0.135.0-pjGUcRG9Xt70OdXl97VF/mode=imports/optimized/three.js';
import { FirstPersonControls } from 'https://cdn.skypack.dev/three/examples/jsm/controls/FirstPersonControls.js';

import { Sky } from 'https://cdn.skypack.dev/three/examples/jsm/objects/Sky.js'

import { GLTFLoader } from 'https://cdn.skypack.dev/three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'https://cdn.skypack.dev/three/examples/jsm/loaders/DRACOLoader.js';

import { SpriteText2D, textAlign } from 'https://cdn.skypack.dev/three-text2d';

import { nanoid } from 'https://cdn.jsdelivr.net/npm/nanoid/nanoid.js';

import { GUI } from 'https://cdn.skypack.dev/three/examples/jsm/libs/lil-gui.module.min.js';

import { addCommentToDb, supabaseClient, Testing } from './database_manager.js';

import 'https://cdn.jsdelivr.net/npm/js-md5@0.7.3/src/md5.min.js';

const loader = new GLTFLoader();
const scene = new THREE.Scene(); // init scene
const clock = new THREE.Clock();

const CLICK_DISTANCE = 200;
const MODAL_DISTANCE = 20;
const MOVE_SPEED = 0.5;
const VERTICAL_MOVE_SPEED = 0.5

// TODO: faster loader
//const newloader = new DRACOLoader();
//newloader.setDecoderPath('/examples/js/libs/draco/');
//newloader.preload();

///////////////////////////////////////
//                                   //
//               SCENE               //
//                                   //
///////////////////////////////////////
// camera
const camera = (() => {
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(-218, 13.9, -117);
    camera.rotation.set(-2.0612374314736113, -1.0533215256732134, -2.1217348078257974);
    scene.add(camera);
    return camera;
})();
// lighting 
(() => {
    const ambient_light = new THREE.AmbientLight(0x404040, 1.5);
    scene.add(ambient_light);
})();
const renderer = (() => {
    const renderer = new THREE.WebGLRenderer({antialias: true}); // init renderer
    document.body.appendChild( renderer.domElement );
    renderer.setSize( window.innerWidth, window.innerHeight );
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.4776;
    return renderer;
})();
const controls = (() => {
    const controls = new FirstPersonControls( camera, renderer.domElement );
    //controls.movementSpeed = 40;
    controls.movementSpeed = 80;
    controls.lookSpeed = 0.2;
    controls.enabled = false;
    return controls;
})();

function initSky() {

    // Add Sky
    let sky = new Sky();
    sky.scale.setScalar( 450000 );
    scene.add( sky );

    let sun = new THREE.Vector3();

    // GUI
    const effectController = {
        //turbidity: 10,
        //rayleigh: 3,
        //mieCoefficient: 0.005,
        //mieDirectionalG: 0.7,
        //elevation: 2,
        //azimuth: 180,
        exposure: renderer.toneMappingExposure,
        turbidity: 10.3,
        rayleigh: 3.533,
        mieCoefficient: 0.006,
        mieDirectionalG: 0.416,
        elevation: 0.1,
        azimuth: 180,

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
    scene.fog = new THREE.FogExp2( '#bbb09b', 0.013 );
        const geometry = new THREE.BufferGeometry();
        const vertices = [];

        for ( let i = 0; i < 15000; i ++ ) {

            const x = 3500 * Math.random() - 2000;
            const y = 3500 * Math.random() - 2000;
            const z = 3500 * Math.random() - 2000;

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
        const dracoLoader = new DRACOLoader();
        dracoLoader.setDecoderPath( 'models/draco/' );
        loader.setDRACOLoader( dracoLoader );
        loader.load('models/final_compressed.gltf', res, undefined, rej);
    });
    world.scene.scale.x = 1;
    world.scene.scale.y = 1;
    world.scene.scale.z = 1;
    world.scene.position.y = -1;
    scene.add(world.scene);
    return world;
})();

const USER = window.localStorage.getItem('username') || prompt("What name would you like to comment with?", await fetch("https://random-word-api.herokuapp.com/word?number=2&swear=0").then(res => res.json()).then(x => x.join(' ')));
//window.localStorage.setItem('username', USER);

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
        if (active_comment?.dbid === payload.new.id) {
            active_comment.toplevel = new Comment(payload.new, active_comment);
            active_comment.beANarcissist();
        }
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
    }
    handleClick(_) {
        if (active_comment !== null) return;    // only start displaying a comment if nothing is currently active
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
    const IRISH_FAMINE = `
    <div style=" font-size: 1.5rem; background: #fafafa; color: #141414; font-family: helvetica; padding: 34px; border-radius: 8px; line-height: 2; "> <b style=" font-size: 2rem; " >

    Great Famine (Ireland)
    <a href="
	https://en.wikipedia.org/wiki/Great_Famine_(Ireland)
    "
    style=" font-size: 0.5rem; position:absolute; left:60px; top:110px; color: #9E9E9E; "
	target="_blank">
	transclusion source
    </a>

    </b> <br>
    <hr style="height: 2px; background-color: #959595; margin-top: 10px; margin-bottom: 30px; ">

    The Great Famine, also known as the Great Hunger, the Famine (mostly within Ireland) or the Irish Potato Famine (mostly outside Ireland), was a period of mass starvation and disease in Ireland from 1845 to 1852. With the most severely affected areas in the west and south of Ireland, where the Irish language was dominant, the period was contemporaneously known in Irish as an Drochshaol, loosely translated as "the hard times" (or literally "the bad life"). The worst year of the period was 1847, known as "Black '47". During the Great Hunger, about 1 million people died and more than a million fled the country, causing the country's population to fall by 20–25%, in some towns falling as much as 67% between 1841 and 1851. Between 1845 and 1855, no fewer than 2.1 million people left Ireland, primarily on packet ships but also steamboats and barks—one of the greatest mass exoduses from a single island in history.
A potato infected with late blight, showing typical rot symptoms

<br>
<br>

The proximate cause of the famine was a potato blight which infected potato crops throughout Europe during the 1840s, causing an additional 100,000 deaths outside Ireland and influencing much of the unrest in the widespread European Revolutions of 1848. From 1846, the impact of the blight was exacerbated by the British Whig government's economic policy of laissez-faire capitalism. Longer-term causes include the system of absentee landlordism and single-crop dependence.


<br>
    <hr style="height: 2px; background-color: #959595; margin-top: 30px; margin-bottom: 30px;
    ">
    <a href="
    https://en.wikipedia.org/wiki/Great_Famine_(Ireland)
    " target="_blank"
    style=" color: #424242; font-size: 1.8rem;
    text-align: center; margin: auto; display: block; margin-left: auto; margin-right: auto; font-weight: 700; " >
    
    <div class="hover:bg-gray-200 transition-all border-0 border-red-400 rounded-md" >
    <span style="font-size: 1.6rem; padding-right: 20px;">↪</span>Keep Reading </div> </a> </div>
    `

    const POLITICAL_PARTY_WELFARE = `
    <div style=" font-size: 1.5rem; background: #fafafa; color: #141414; font-family: helvetica; padding: 34px; border-radius: 8px; line-height: 2; "> <b style=" font-size: 2rem; " >

    Society of Tammany Hall and Welfare
    <a href="
    https://en.wikipedia.org/wiki/Tammany_Hall
    "
    style=" font-size: 0.5rem; position:absolute; left:60px; top:110px; color: #9E9E9E; "
	target="_blank">
	transclusion source
    </a>

    </b> <br>
    <hr style="height: 2px; background-color: #959595; margin-top: 10px; margin-bottom: 30px; ">
Tammany Hall, also known as the Society of St. Tammany, the Sons of St. Tammany, or the Columbian Order, was a New York City political organization founded in 1786 and incorporated on May 12, 1789, as the Tammany Society. It became the main local political machine of the Democratic Party, and played a major role in controlling New York City and New York State politics and helping immigrants, most notably the Irish, rise in American politics from the 1790s to the 1960s. It typically controlled Democratic Party nominations and political patronage in Manhattan after the mayoral victory of Fernando Wood in 1854, and used its patronage resources to build a loyal, well-rewarded core of district and precinct leaders; after 1850 the vast majority were Irish Catholics due to mass immigration from Ireland during and after the Irish Famine.

The Tammany Society emerged as the center for Democratic-Republican Party politics in the city in the early 19th century. After 1854, the Society expanded its political control even further by earning the loyalty of the city's rapidly expanding immigrant community, which functioned as its base of political capital. The business community appreciated its readiness, at moderate cost, to cut through regulatory and legislative mazes to facilitate rapid economic growth. The Tammany Hall ward boss or ward heeler, as wards were the city's smallest political units from 1786 to 1938, served as the local vote gatherer and provider of patronage. By 1872 Tammany had an Irish Catholic "boss", and in 1928 a Tammany hero, New York Governor Al Smith, won the Democratic presidential nomination. However, Tammany Hall also served as an engine for graft and political corruption, perhaps most infamously under William M. "Boss" Tweed in the mid-19th century. By the 1880s, Tammany was building local clubs that appealed to social activists from the ethnic middle class. In quiet times the machine had the advantage of a core of solid supporters and usually exercised control of politics and policymaking in Manhattan; it also played a major role in the state legislature in Albany.

<br>
    <hr style="height: 2px; background-color: #959595; margin-top: 30px; margin-bottom: 30px;
    ">
    <a href="
    https://en.wikipedia.org/wiki/Tammany_Hall
    " target="_blank"
    style=" color: #424242; font-size: 1.8rem;
    text-align: center; margin: auto; display: block; margin-left: auto; margin-right: auto; font-weight: 700; " >
    
    <div class="hover:bg-gray-200 transition-all border-0 border-red-400 rounded-md" >
    <span style="font-size: 1.6rem; padding-right: 20px;">↪</span>Keep Reading </div> </a> </div>
    `

    const STATE_VS_FEDERAL_RIGHTS = `
    <div style=" font-size: 1.5rem; background: #fafafa; color: #141414; font-family: helvetica; padding: 34px; border-radius: 8px; line-height: 2; "> <b style=" font-size: 2rem; " >

    State vs Federal Rights
    <a href="
    https://www.battlefields.org/learn/articles/states-rights
    "
    style=" font-size: 0.5rem; position:absolute; left:60px; top:110px; color: #9E9E9E; "
	target="_blank">
	transclusion source
    </a>

    </b> <br>
    <hr style="height: 2px; background-color: #959595; margin-top: 10px; margin-bottom: 30px; ">

    The appeal to states' rights is of the most potent symbols of the American Civil War, but confusion abounds as to the historical and present meaning of this federalist principle. 

The concept of states' rights had been an old idea by 1860. The original thirteen colonies in America in the 1700s, separated from the mother country in Europe by a vast ocean, were use to making many of their own decisions and ignoring quite a few of the rules imposed on them from abroad. During the American Revolution, the founding fathers were forced to compromise with the states to ensure ratification of the Constitution and the establishment of a united country. In fact, the original Constitution banned slavery, but Virginia would not accept it; and Massachusetts would not ratify the document without a Bill of Rights.

<br>
    <hr style="height: 2px; background-color: #959595; margin-top: 30px; margin-bottom: 30px;
    ">
    <a href="
    https://www.battlefields.org/learn/articles/states-rights
    " target="_blank"
    style=" color: #424242; font-size: 1.8rem;
    text-align: center; margin: auto; display: block; margin-left: auto; margin-right: auto; font-weight: 700; " >
    
    <div class="hover:bg-gray-200 transition-all border-0 border-red-400 rounded-md" >
    <span style="font-size: 1.6rem; padding-right: 20px;">↪</span>Keep Reading </div> </a> </div>
    `

    const COMPROMISE_1850 = `
    <div style=" font-size: 1.5rem; background: #fafafa; color: #141414; font-family: helvetica; padding: 34px; border-radius: 8px; line-height: 2; "> <b style=" font-size: 2rem; " >

    Compromise of 1850
    <a href="
	https://en.wikipedia.org/wiki/Compromise_of_1850?scrlybrkr=b9099579
    "
    style=" font-size: 0.5rem; position:absolute; left:60px; top:110px; color: #9E9E9E; "
	target="_blank">
	transclusion source
    </a>

    </b> <br>
    <hr style="height: 2px; background-color: #959595; margin-top: 10px; margin-bottom: 30px; ">

    The Compromise of 1850 was a package of five separate bills passed by the United States Congress in September 1850 that defused a political confrontation between slave and free states on the status of territories acquired in the Mexican–American War. It also set Texas's western and northern borders and included provisions addressing fugitive slaves and the slave trade. The compromise was brokered by Whig senator Henry Clay and Democratic senator Stephen A. Douglas, with the support of President Millard Fillmore.

<br>
<br>

A debate over slavery in the territories had erupted during the Mexican–American War, as many Southerners sought to expand slavery to the newly-acquired lands and many Northerners opposed any such expansion. The debate was further complicated by Texas's claim to all former Mexican territory north and east of the Rio Grande, including areas it had never effectively controlled. These issues prevented the passage of organic acts to create organized territorial governments for the land acquired in the Mexican–American War. In early 1850, Clay proposed a package of eight bills that would settle most of the pressing issues before Congress. Clay's proposal was opposed by President Zachary Taylor, anti-slavery Whigs like William Seward, and pro-slavery Democrats like John C. Calhoun, and congressional debate over the territories continued. The debates over the bill were the most famous in Congressional history, and the divisions devolved into fistfights and drawn guns on the floor of Congress.


<br>
    <hr style="height: 2px; background-color: #959595; margin-top: 30px; margin-bottom: 30px;
    ">
    <a href="
    https://en.wikipedia.org/wiki/Compromise_of_1850?scrlybrkr=b9099579
    " target="_blank"
    style=" color: #424242; font-size: 1.8rem;
    text-align: center; margin: auto; display: block; margin-left: auto; margin-right: auto; font-weight: 700; " >
    
    <div class="hover:bg-gray-200 transition-all border-0 border-red-400 rounded-md" >
    <span style="font-size: 1.6rem; padding-right: 20px;">↪</span>Keep Reading </div> </a> </div>
    `
    
    const EUROPEAN_IMMIGRATION = `

    <div style=" font-size: 1.5rem; background: #fafafa; color: #141414; font-family: helvetica; padding: 34px; border-radius: 8px; line-height: 2; "> <b style=" font-size: 2rem; " >

    Immigration to the US

    <a href="
	https://www.loc.gov/classroom-materials/united-states-history-primary-source-timeline/rise-of-industrial-america-1876-1900/immigration-to-united-states-1851-1900/
    "
    style=" font-size: 0.5rem; position:absolute; left:60px; top:110px; color: #9E9E9E; "
	target="_blank">
	transclusion source
    </a>

    </b> <br>
    <hr style="height: 2px; background-color: #959595; margin-top: 10px; margin-bottom: 30px; ">

    In the late 1800s, people in many parts of the world decided to leave their homes and immigrate to the United States. Fleeing crop failure, land and job shortages, rising taxes, and famine, many came to the U. S. because it was perceived as the land of economic opportunity. Others came seeking personal freedom or relief from political and religious persecution, and nearly 12 million immigrants arrived in the United States between 1870 and 1900. During the 1870s and 1880s, the vast majority of these people were from Germany, Ireland, and England - the principal sources of immigration before the Civil War. Even so, a relatively large group of Chinese immigrated to the United States between the start of the California gold rush in 1849 and 1882, when federal law stopped their immigration.



<br>
<br>

With the onset of hard economic times in the 1870s, European immigrants and Americans began to compete for the jobs traditionally reserved for the Chinese. With economic competition came dislike and even racial suspicion and hatred. Such feelings were accompanied by anti-Chinese riots and pressure, especially in California, for the exclusion of Chinese immigrants from the United States. The result of this pressure was the Chinese Exclusion Act, passed by Congress in 1882. This Act virtually ended Chinese immigration for nearly a century.


<br>
    <hr style="height: 2px; background-color: #959595; margin-top: 30px; margin-bottom: 30px;
    ">
    <a href="
    https://www.loc.gov/classroom-materials/united-states-history-primary-source-timeline/rise-of-industrial-america-1876-1900/immigration-to-united-states-1851-1900/
    " target="_blank"
    style=" color: #424242; font-size: 1.8rem;
    text-align: center; margin: auto; display: block; margin-left: auto; margin-right: auto; font-weight: 700; " >
    
    <div class="hover:bg-gray-200 transition-all border-0 border-red-400 rounded-md" >
    <span style="font-size: 1.6rem; padding-right: 20px;">↪</span>Keep Reading </div> </a> </div>
    `

    const INFLUX = `

    <div style=" font-size: 1.5rem; background: #fafafa; color: #141414; font-family: helvetica; padding: 34px; border-radius: 8px; line-height: 2; "> <b style=" font-size: 2rem; " >

    Escaped Slaves in the United States

    <a href="
	https://en.wikipedia.org/wiki/Fugitive_slaves_in_the_United_States
    "
    style=" font-size: 0.5rem; position:absolute; left:60px; top:110px; color: #9E9E9E; "
	target="_blank">
	transclusion source
    </a>

    </b> <br>
    <hr style="height: 2px; background-color: #959595; margin-top: 10px; margin-bottom: 30px; ">

    In the United States, fugitive slaves or runaway slaves were terms used in the 18th and 19th century to describe enslaved people who fled slavery. The term also refers to the federal Fugitive Slave Acts of 1793 and 1850. Such people are also called freedom seekers to avoid implying that the enslaved person had committed a crime and that the slaveholder was the injured party.

Generally, they tried to reach states or territories where slavery was banned, including Canada, or, until 1821, Spanish Florida. Most slave law tried to control slave travel by requiring them to carry official passes if traveling without a master with them.

Passage of the Fugitive Slave Act of 1850 increased penalties against enslaved people and those who aided them. Because of this, freedom seekers left the United States altogether, traveling to Canada or Mexico. Approximately 100,000 American slaves escaped to freedom



<br>
<br>

Generally, they tried to reach states or territories where slavery was banned, including Canada, or, until 1821, Spanish Florida. Most slave law tried to control slave travel by requiring them to carry official passes if traveling without a master with them.

Passage of the Fugitive Slave Act of 1850 increased penalties against enslaved people and those who aided them. Because of this, freedom seekers left the United States altogether, traveling to Canada or Mexico. Approximately 100,000 American slaves escaped to freedom


<br>
    <hr style="height: 2px; background-color: #959595; margin-top: 30px; margin-bottom: 30px;
    ">
    <a href="
    https://en.wikipedia.org/wiki/Fugitive_slaves_in_the_United_States
    " target="_blank"
    style=" color: #424242; font-size: 1.8rem;
    text-align: center; margin: auto; display: block; margin-left: auto; margin-right: auto; font-weight: 700; " >
    
    <div class="hover:bg-gray-200 transition-all border-0 border-red-400 rounded-md" >
    <span style="font-size: 1.6rem; padding-right: 20px;">↪</span>Keep Reading </div> </a> </div>
    `

    const DOUGLASS = `

    <div style=" font-size: 1.5rem; background: #fafafa; color: #141414; font-family: helvetica; padding: 34px; border-radius: 8px; line-height: 2; "> <b style=" font-size: 2rem; " >

    Stephen Douglass Philosophy
    <a href="
	https://www.britannica.com/biography/Stephen-A-Douglas
    "
    style=" font-size: 0.5rem; position:absolute; left:60px; top:110px; color: #9E9E9E; "
	target="_blank">
	transclusion source
    </a>

    </b> <br>
    <hr style="height: 2px; background-color: #959595; margin-top: 10px; margin-bottom: 30px; ">

    Stephen A. Douglas, in full Stephen Arnold Douglas, (born April 23, 1813, Brandon, Vermont, U.S.—died June 3, 1861, Chicago, Illinois), American politician, leader of the Democratic Party, and orator who espoused the cause of popular sovereignty in relation to the issue of slavery in the territories before the American Civil War (1861–65). He was reelected senator from Illinois in 1858 after a series of eloquent debates with the Republican candidate, Abraham Lincoln, who defeated him in the presidential race two years later.

Douglas was elected in 1846 to the U.S. Senate, in which he served until his death; there he became deeply involved in the nation’s search for a solution to the slavery problem. As chairman of the Committee on Territories, he was particularly prominent in the bitter debates between North and South on the extension of slavery westward. Trying to remove the onus from Congress, he developed the theory of popular sovereignty (originally called squatter sovereignty), under which the people in a territory would themselves decide whether to permit slavery within their region’s boundaries. Douglas himself was not a slaveholder, though his wife was. He was influential in the passage of the Compromise of 1850 (which tried to maintain a congressional balance between free and slave states), and the organization of the Utah and New Mexico territories under popular sovereignty was a victory for his doctrine.


<br>
<br>


<br>
    <hr style="height: 2px; background-color: #959595; margin-top: 30px; margin-bottom: 30px;
    ">
    <a href="
    https://www.britannica.com/biography/Stephen-A-Douglas
    " target="_blank"
    style=" color: #424242; font-size: 1.8rem;
    text-align: center; margin: auto; display: block; margin-left: auto; margin-right: auto; font-weight: 700; " >
    
    <div class="hover:bg-gray-200 transition-all border-0 border-red-400 rounded-md" >
    <span style="font-size: 1.6rem; padding-right: 20px;">↪</span>Keep Reading </div> </a> </div>









    <div style=" font-size: 1.5rem; background: #fafafa; color: #141414; font-family: helvetica; padding: 34px; border-radius: 8px; line-height: 2; " class="mt-4"> <b style=" font-size: 2rem; " >

    Popular Sovereignty

    <a href="
	    https://www.britannica.com/topic/popular-sovereignty
    "
    style=" font-size: 0.5rem; position:absolute; left:60px; top:110px; color: #9E9E9E; "
	target="_blank">
    </a>

    </b> <br>
    <hr style="height: 2px; background-color: #959595; margin-top: 10px; margin-bottom: 30px; ">

    Stephen A. Douglas, in full Stephen Arnold Douglas, (born April 23, 1813, Brandon, Vermont, U.S.—died June 3, 1861, Chicago, Illinois), American politician, leader of the Democratic Party, and orator who espoused the cause of popular sovereignty in relation to the issue of slavery in the territories before the American Civil War (1861–65). He was reelected senator from Illinois in 1858 after a series of eloquent debates with the Republican candidate, Abraham Lincoln, who defeated him in the presidential race two years later.

Douglas was elected in 1846 to the U.S. Senate, in which he served until his death; there he became deeply involved in the nation’s search for a solution to the slavery problem. As chairman of the Committee on Territories, he was particularly prominent in the bitter debates between North and South on the extension of slavery westward. Trying to remove the onus from Congress, he developed the theory of popular sovereignty (originally called squatter sovereignty), under which the people in a territory would themselves decide whether to permit slavery within their region’s boundaries. Douglas himself was not a slaveholder, though his wife was. He was influential in the passage of the Compromise of 1850 (which tried to maintain a congressional balance between free and slave states), and the organization of the Utah and New Mexico territories under popular sovereignty was a victory for his doctrine.


<br>
<br>


<br>
    <hr style="height: 2px; background-color: #959595; margin-top: 30px; margin-bottom: 30px;
    ">
    <a href="
        https://www.britannica.com/topic/popular-sovereignty
    " target="_blank"
    style=" color: #424242; font-size: 1.8rem;
    text-align: center; margin: auto; display: block; margin-left: auto; margin-right: auto; font-weight: 700; " >
    
    <div class="hover:bg-gray-200 transition-all border-0 border-red-400 rounded-md" >
    <span style="font-size: 1.6rem; padding-right: 20px;">↪</span>Keep Reading </div> </a> </div>

    `

    const CONFLICT_OVER_SLAVERY = `
    <div style=" font-size: 1.5rem; background: #fafafa; color: #141414; font-family: helvetica; padding: 34px; border-radius: 8px; line-height: 2; "> <b style=" font-size: 2rem; " >

    Conflict over Slavery
    <a href="
    https://www.nps.gov/liho/learn/historyculture/slavery-cause-civil-war.htm
    "
    style=" font-size: 0.5rem; position:absolute; left:60px; top:110px; color: #9E9E9E; "
	target="_blank">
	transclusion source
    </a>

    </b> <br>
    <hr style="height: 2px; background-color: #959595; margin-top: 10px; margin-bottom: 30px; ">

    Today, most professional historians agree with Stephens that slavery and the status of African Americans were at the heart of the crisis that plunged the U.S. into a civil war from 1861 to 1865. That is not to say that the average Confederate soldier fought to preserve slavery or that the North went to war to end slavery. Soldiers fight for many reasons — notably to stay alive and support their comrades in arms — and the North’s goal in the beginning was preservation of the Union, not emancipation. For the 200,000 African Americans who ultimately served the U.S. in the war, emancipation was the primary aim.

The roots of the crisis over slavery that gripped the nation in 1860–1861 go back to the nation’s founding. European settlers brought a system of slavery with them to the western hemisphere in the 1500s. Unable to find cheap labor from other sources, white settlers increasingly turned to slaves imported from Africa. By the early 1700s in British North America, slavery meant African slavery. Southern plantations using slave labor produced the great export crops — tobacco, rice, forest products, and indigo — that made the American colonies profitable. Many Northern merchants made their fortunes either in the slave trade or by exporting the products of slave labor. African slavery was central to the development of British North America.

<br>
    <hr style="height: 2px; background-color: #959595; margin-top: 30px; margin-bottom: 30px;
    ">
    <a href="
    https://www.nps.gov/liho/learn/historyculture/slavery-cause-civil-war.htm
    " target="_blank"
    style=" color: #424242; font-size: 1.8rem;
    text-align: center; margin: auto; display: block; margin-left: auto; margin-right: auto; font-weight: 700; " >
    
    <div class="hover:bg-gray-200 transition-all border-0 border-red-400 rounded-md" >
    <span style="font-size: 1.6rem; padding-right: 20px;">↪</span>Keep Reading </div> </a> </div>
    `

    const THE_CIVIL_WAR = `
    <div style=" font-size: 1.5rem; background: #fafafa; color: #141414; font-family: helvetica; padding: 34px; border-radius: 8px; line-height: 2; "> <b style=" font-size: 2rem; " >

    American Civil War
    <a href="
    https://en.wikipedia.org/wiki/American_Civil_War
    "
    style=" font-size: 0.5rem; position:absolute; left:60px; top:110px; color: #9E9E9E; "
	target="_blank">
	transclusion source
    </a>

    </b> <br>
    <hr style="height: 2px; background-color: #959595; margin-top: 10px; margin-bottom: 30px; ">

The American Civil War (April 12, 1861 – May 9, 1865) (also known by other names) was a civil war in the United States fought between the Union (states that remained loyal to the federal union, or "the North") and the Confederacy (states that voted to secede, or "the South"). The central cause of the war was the status of slavery, especially the expansion of slavery into territories acquired as a result of the Louisiana Purchase and the Mexican–American War. On the eve of the civil war in 1860, four million of the 32 million Americans (~13%) were enslaved black people, almost all in the South.

The practice of slavery in the United States was one of the key political issues of the 19th century. Decades of political unrest over slavery led up to the civil war. Disunion came after Abraham Lincoln won the 1860 United States presidential election on an anti-slavery expansion platform. An initial seven southern slave states declared their secession from the country to form the Confederacy. Confederate forces seized federal forts within territory they claimed. The last minute Crittenden Compromise tried to avert conflict but failed; both sides prepared for war. Fighting broke out in April 1861 when the Confederate army began the Battle of Fort Sumter in South Carolina, just over a month after the first inauguration of Abraham Lincoln. The Confederacy grew to control at least a majority of territory in eleven states (out of the 34 U.S. states in February 1861), and asserted claims to two more. The states that remained loyal to the federal government were known as the Union. Both sides raised large volunteer and conscription armies. Four years of intense combat, mostly in the South, ensued.

<br>
    <hr style="height: 2px; background-color: #959595; margin-top: 30px; margin-bottom: 30px;
    ">
    <a href="
    https://en.wikipedia.org/wiki/American_Civil_War
    " target="_blank"
    style=" color: #424242; font-size: 1.8rem;
    text-align: center; margin: auto; display: block; margin-left: auto; margin-right: auto; font-weight: 700; " >
    
    <div class="hover:bg-gray-200 transition-all border-0 border-red-400 rounded-md" >
    <span style="font-size: 1.6rem; padding-right: 20px;">↪</span>Keep Reading </div> </a> </div>

`

    const EXPAN_INDU = `

    <div style=" font-size: 1.5rem; background: #fafafa; color: #141414; font-family: helvetica; padding: 34px; border-radius: 8px; line-height: 2; "> <b style=" font-size: 2rem; " >

    Civil War and Industrial Expansion
    <a href="
    https://www.encyclopedia.com/history/encyclopedias-almanacs-transcripts-and-maps/civil-war-and-industrial-expansion-1860-1897-overview
    "
    style=" font-size: 0.5rem; position:absolute; left:60px; top:110px; color: #9E9E9E; "
	target="_blank">
	transclusion source
    </a>

    </b> <br>
    <hr style="height: 2px; background-color: #959595; margin-top: 10px; margin-bottom: 30px; ">

The period between the American Civil War (1861–65) and the end of the nineteenth century in the United States was marked by tremendous expansion of industry and agriculture as well as the spread of settlement across the continent. The population of the United States more than doubled during this period. In its report on the 1890 census the Bureau of the Census declared the frontier closed. Most of the economic growth was concentrated in the Northeast, Midwest, and plains states. The South remained largely agricultural, its total industrial production totaling about half that of New York State. The Northeast clearly emerged as the industrial core of the nation with 85 percent of the nation's manufacturing, processing raw materials from the Midwest and West.


<br>
<br>
For several decades prior to the Civil War, the North was forced to delay or compromise several of its national economic policy objectives due to Southern opposition and the strong position the Southern states held in the Senate. As soon as the Southern states seceded Congress began enacting this delayed agenda. The Morrill Tariff of 1861 raised rates to 20 percent on average, ending more than 30 years of declining tariffs. Funding for three transcontinental railroads was enacted in the Transcontinental Railroad Act. The Morrill Land Grant Act (1862) established agricultural and mechanical colleges by allotting each state that remained in the Union 30,000 acres of land for each member of Congress. The Homestead Act (1862) provided 160 acres (a quarter section) in western territories free to anyone who settled on it for five years and declared their intention to become a citizen. Each of these policies profoundly shaped the development of the U.S. economy for the rest of the century.
<br>

    <hr style="height: 2px; background-color: #959595; margin-top: 30px; margin-bottom: 30px;
    ">
    <a href="
    https://www.encyclopedia.com/history/encyclopedias-almanacs-transcripts-and-maps/civil-war-and-industrial-expansion-1860-1897-overview
    " target="_blank"
    style=" color: #424242; font-size: 1.8rem;
    text-align: center; margin: auto; display: block; margin-left: auto; margin-right: auto; font-weight: 700; " >
    
    <div class="hover:bg-gray-200 transition-all border-0 border-red-400 rounded-md" >
    <span style="font-size: 1.6rem; padding-right: 20px;">↪</span>Keep Reading </div> </a> </div>

    `



    const FREE_LABOR = `

    <div style=" font-size: 1.5rem; background: #fafafa; color: #141414; font-family: helvetica; padding: 34px; border-radius: 8px; line-height: 2; "> <b style=" font-size: 2rem; " >

    Free Labor Ideology in the North
    <a href="
    http://www.vcdh.virginia.edu/solguide/VUS06/essay06c.html
    "
    style=" font-size: 0.5rem; position:absolute; left:60px; top:110px; color: #9E9E9E; "
	target="_blank">
	transclusion source
    </a>

    </b> <br>
    <hr style="height: 2px; background-color: #959595; margin-top: 10px; margin-bottom: 30px; ">

In competition with the slave system of the South was the concept of "free labor" advocated by many in the Northeastern states. Although the term might suggest the same meaning, the word "free" had nothing to do with bondage or working for no wage, but rather indicated concepts of freedom, independence, and self-reliance. The concept emphasized an egalitarian vision of individual human potential, the idea that anyone could climb the ladder of success with hard work and dedication. Such concepts and confidence in individual potential sprung from, or were at least supported by, the religious revivalism of the era known as the Second Great Awakening. At the same time, secular American philosophers like Ralph Waldo Emerson and Henry David Thoreau were stressing ideas of self-reliance through concepts like transcendentalism.


<br>
<br>
Like it had done in Europe years before, industrialization changed the nature of work and production in the Northeast. In the "Agrarian Republic" of early America, the home was the center of manufacture and production. Skilled workers learned specialized trades through apprenticeships. Industry moved the workplace to the factory where machinery required far fewer skills from laborers. The textile mills in Massachusetts stand as the most classic example of early American industrialization.


<br>

    <hr style="height: 2px; background-color: #959595; margin-top: 30px; margin-bottom: 30px;
    ">
    <a href="
    http://www.vcdh.virginia.edu/solguide/VUS06/essay06c.html
    " target="_blank"
    style=" color: #424242; font-size: 1.8rem;
    text-align: center; margin: auto; display: block; margin-left: auto; margin-right: auto; font-weight: 700; " >
    
    <div class="hover:bg-gray-200 transition-all border-0 border-red-400 rounded-md" >
    <span style="font-size: 1.6rem; padding-right: 20px;">↪</span>Keep Reading </div> </a> </div>
    `

    const ANTI_SLAVERY_SEN = `

    <div style=" font-size: 1.5rem; background: #fafafa; color: #141414; font-family: helvetica; padding: 34px; border-radius: 8px; line-height: 2; "> <b style=" font-size: 2rem; " >

    Antislavery Sentiment
    <a href="
    https://www.historyisfun.org/jamestown-settlement/from-africa-to-virginia/antislavery-sentiment/
    "
    style=" font-size: 0.5rem; position:absolute; left:60px; top:110px; color: #9E9E9E; "
	target="_blank">
	transclusion source
    </a>

    </b> <br>
    <hr style="height: 2px; background-color: #959595; margin-top: 10px; margin-bottom: 30px; ">

Some Americans began expressing reservations about slavery long before the ferment of opposition to British policies in the 1760s led others to link colonial rights to those of slaves. At first, opposition to slavery arose from moral and religious grounds, but increasingly influenced by economic, cultural or political motives, more Americans began to speak out against slavery and the slave trade.




<br>
<br>
In 1700 Samuel Sewell, a wealthy merchant from Massachusetts, published the first direct attack on slavery and the slave trade in New England. In The Selling of Joseph, Sewell undermined the moral and biblical justifications of slavery by asserting that all men, as sons of Adam, had “equal rights to liberty.” Sewell’s pamphlet gained few converts, but around the same time the Quakers of Pennsylvania slowly and painfully began to confront the contradictions posed by their religious beliefs and their involvement in both the ownership of and trade in slaves.


<br>

    <hr style="height: 2px; background-color: #959595; margin-top: 30px; margin-bottom: 30px;
    ">
    <a href="
    https://www.historyisfun.org/jamestown-settlement/from-africa-to-virginia/antislavery-sentiment/
    " target="_blank"
    style=" color: #424242; font-size: 1.8rem;
    text-align: center; margin: auto; display: block; margin-left: auto; margin-right: auto; font-weight: 700; " >
    
    <div class="hover:bg-gray-200 transition-all border-0 border-red-400 rounded-md" >
    <span style="font-size: 1.6rem; padding-right: 20px;">↪</span>Keep Reading </div> </a> </div>
    `





    const NORTH_HARBORS = `

    <div style=" font-size: 1.5rem; background: #fafafa; color: #141414; font-family: helvetica; padding: 34px; border-radius: 8px; line-height: 2; "> <b style=" font-size: 2rem; " >

    Antislavery Sentiment
    <a href="
    https://www.historyisfun.org/jamestown-settlement/from-africa-to-virginia/antislavery-sentiment/
    "
    style=" font-size: 0.5rem; position:absolute; left:60px; top:110px; color: #9E9E9E; "
	target="_blank">
	transclusion source
    </a>

    </b> <br>
    <hr style="height: 2px; background-color: #959595; margin-top: 10px; margin-bottom: 30px; ">

Some Americans began expressing reservations about slavery long before the ferment of opposition to British policies in the 1760s led others to link colonial rights to those of slaves. At first, opposition to slavery arose from moral and religious grounds, but increasingly influenced by economic, cultural or political motives, more Americans began to speak out against slavery and the slave trade.




<br>
<br>
In 1700 Samuel Sewell, a wealthy merchant from Massachusetts, published the first direct attack on slavery and the slave trade in New England. In The Selling of Joseph, Sewell undermined the moral and biblical justifications of slavery by asserting that all men, as sons of Adam, had “equal rights to liberty.” Sewell’s pamphlet gained few converts, but around the same time the Quakers of Pennsylvania slowly and painfully began to confront the contradictions posed by their religious beliefs and their involvement in both the ownership of and trade in slaves.


<br>

    <hr style="height: 2px; background-color: #959595; margin-top: 30px; margin-bottom: 30px;
    ">
    <a href="
    https://www.historyisfun.org/jamestown-settlement/from-africa-to-virginia/antislavery-sentiment/
    " target="_blank"
    style=" color: #424242; font-size: 1.8rem;
    text-align: center; margin: auto; display: block; margin-left: auto; margin-right: auto; font-weight: 700; " >
    
    <div class="hover:bg-gray-200 transition-all border-0 border-red-400 rounded-md" >
    <span style="font-size: 1.6rem; padding-right: 20px;">↪</span>Keep Reading </div> </a> </div>
    `





    const COTTON_KING = `

    <div style=" font-size: 1.5rem; background: #fafafa; color: #141414; font-family: helvetica; padding: 34px; border-radius: 8px; line-height: 2; "> <b style=" font-size: 2rem; " >

    Cotton is King
    <a href="
    https://www.pbs.org/wnet/african-americans-many-rivers-to-cross/history/why-was-cotton-king/#:~:text=The%20most%20commonly%20used%20phrase,it%20is%20important%20to%20understand
    "
    style=" font-size: 0.5rem; position:absolute; left:60px; top:110px; color: #9E9E9E; "
	target="_blank">
	transclusion source
    </a>

    </b> <br>
    <hr style="height: 2px; background-color: #959595; margin-top: 10px; margin-bottom: 30px; ">

The most commonly used phrase describing the growth of the American economy in the 1830s and 1840s was “Cotton Is King.” We think of this slogan today as describing the plantation economy of the slavery states in the Deep South, which led to the creation of “the second Middle Passage.” But it is important to understand that this was not simply a Southern phenomenon. Cotton was one of the world’s first luxury commodities, after sugar and tobacco, and was also the commodity whose production most dramatically turned millions of black human beings in the United States themselves into commodities. Cotton became the first mass consumer commodity.


<br>
<br>
Understanding both how extraordinarily profitable cotton was and how interconnected and overlapping were the economies of the cotton plantation, the Northern banking industry, New England textile factories and a huge proportion of the economy of Great Britain helps us to understand why it was something of a miracle that slavery was finally abolished in this country at all.



<br>

    <hr style="height: 2px; background-color: #959595; margin-top: 30px; margin-bottom: 30px;
    ">
    <a href="
    https://www.pbs.org/wnet/african-americans-many-rivers-to-cross/history/why-was-cotton-king/#:~:text=The%20most%20commonly%20used%20phrase,it%20is%20important%20to%20understand
    " target="_blank"
    style=" color: #424242; font-size: 1.8rem;
    text-align: center; margin: auto; display: block; margin-left: auto; margin-right: auto; font-weight: 700; " >
    
    <div class="hover:bg-gray-200 transition-all border-0 border-red-400 rounded-md" >
    <span style="font-size: 1.6rem; padding-right: 20px;">↪</span>Keep Reading </div> </a> </div>
    `











    const nodes = [
        // top left reasons
        { x: -200, z: -114, size:  30, label: "European Food Shortages", content: IRISH_FAMINE },
        { x: -126, z: -116, size:  20, label: "European Immigration", content: EUROPEAN_IMMIGRATION},
        { x: -207, z: - 38, size:  30, label: "Influx of Escaped Slaves", content: INFLUX },
        { x: -127, z: - 86, size:  50, label: "Political Party Welfare", content: POLITICAL_PARTY_WELFARE },

        // top right reasons
        { x: - 69, z: -186, size:  20, label: "Stephen Douglass Philosophy", content: DOUGLASS },
        { x: - 11, z: -168, size:  30, label: "Expansion and Industrialization", content: EXPAN_INDU },

        // bottom left
        { x: -175, z:   61, size:  30, label: "Compromise of 1850", content: COMPROMISE_1850 },
        { x: -134, z:  112, size:  30, label: "Free Labor Ideology", content: FREE_LABOR },
        { x: -114, z:   63, size:  45, label: "Antislavery Sentiment", content: ANTI_SLAVERY_SEN},
        { x: - 81, z:   11, size:  45, label: "North Harbors Escapees", content: NORTH_HARBORS },

        // bottom center
        { x: - 31, z:   72, size:  35, label: "Cotton is King", content: COTTON_KING },
        { x: - 25, z:   24, size:  20, label: "Strong Economic Incentives", content: "todo" },

        // central three themes
        { x: - 34, z: - 67, size:  90, label: "Fear of Government Overreach", content: "todo" },
        { x: - 48, z: -139, size:  60, label: "State vs Federal Power", content: STATE_VS_FEDERAL_RIGHTS },
        { x: - 30, z: - 15, size:  80, label: "Conflict over Slavery", content: CONFLICT_OVER_SLAVERY },

        { x:   54, z: - 77, size: 120, label: "The Civil War", y: 17, content: THE_CIVIL_WAR },
    ]

    function makeTextSprite(text) {
        const ratio = 10;
        const fontsize = 22;

        // prepare canvas
        var canvas = document.createElement('canvas');
        const res_w = canvas.width * ratio;
        const res_h = canvas.width * ratio;
        canvas.width = res_w;
        canvas.height = res_h;
        var ctx = canvas.getContext('2d');
        ctx.setTransform(ratio, 0, 0, ratio, 0, 0); // scale high-res canvas https://stackoverflow.com/a/15666143/10372825

        // draw text
        ctx.font = `bold ${fontsize}px Helvetica`;
        ctx.fillStyle = "#c4daff";
        ctx.strokeStyle = ctx.fillStyle;
        // draw wrapped lines and bounding box
        (() => {
            function getLines(ctx, text, maxWidth) {
                var words = text.split(" ");
                var lines = [];
                var currentLine = words[0];

                for (var i = 1; i < words.length; i++) {
                    var word = words[i];
                    var width = ctx.measureText(currentLine + " " + word).width;
                    if (width < maxWidth) {
                        currentLine += " " + word;
                    } else {
                        lines.push(currentLine);
                        currentLine = word;
                    }
                }
                lines.push(currentLine);
                return lines;
            }
            function drawCentered(line, lines_below) {
                const line_width = ctx.measureText(line);
                ctx.fillText(line, 150 - line_width.width/2, 150 - fontsize * lines_below);
            }
            const lines = getLines(ctx, text, res_w / ratio - 20);
            for (let i=lines.length; i>0; i--) {
                drawCentered(lines[i-1], lines.length-i);
            }
            const max_line_width = lines.map(l => ctx.measureText(l).width).reduce((a, c) => Math.max(a, c), -Infinity);
            ctx.strokeRect(150 - max_line_width/2 - 10, 150-fontsize*lines.length - 2, max_line_width + 20, fontsize*lines.length + 12)
        })();

        // convert canvas to sprite
        var texture = new THREE.Texture(canvas) 
        texture.needsUpdate = true;
        var spriteMaterial = new THREE.SpriteMaterial( { map: texture } );
        spriteMaterial.depthTest = false;
        var sprite = new THREE.Sprite( spriteMaterial );
        sprite.scale.set(fontsize, fontsize, fontsize);
        return sprite;  
    }

    console.log('creating textual labels...')
    const geofenced = nodes.map(n => {
        // label text
        const label = makeTextSprite(n.label);
        label.position.x = n.x;
        label.position.z = n.z;
        label.position.y = n.y || 7;
        scene.add(label);

        // label light
        const light = new THREE.PointLight(0xA2F0FF, 1, n.size+20 || 30);
        light.position.set(n.x, n.y || 7, n.z);
        scene.add(light);

        return { mesh: label, content: n.content };
    });

    return geofenced;
})();

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

    console.log(camera.position, camera.rotation);

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
        if (active_comment !== null) return;    // get overriden by active comment
        this.target = obj;
        this.updateContent();
    }
    updateContent(content = null) {
        if (active_comment !== null) return;
        if (this.target === null) {
            modal_manager.clear();
        } else {
            if (content !== null) this.target.content = content;
            modal_manager.setHTML(this.target.content);
        }
    }
}
const geofence_manager = new GeofencedModalManager;

// ANIMATION LOOP
function animate(timestamp) {
    requestAnimationFrame( animate );
    renderer.setSize( window.innerWidth, window.innerHeight );

    if (up) { camera.position.y += VERTICAL_MOVE_SPEED; }
    if (down) { camera.position.y -= VERTICAL_MOVE_SPEED; }
    if (manual_move) {
        if (moving[0]) { camera.translateZ( -MOVE_SPEED ) }
        if (moving[1]) { camera.translateX( -MOVE_SPEED ) }
        if (moving[2]) { camera.translateZ(  MOVE_SPEED ) }
        if (moving[3]) { camera.translateX(  MOVE_SPEED ) }
    }

    for (const c of Object.values(allComments)) {
        c.mesh.rotation.y += 0.0025
    }

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

console.log("awaiting world...")
const world = await worldPromise;
console.log("world loaded")

animate();

