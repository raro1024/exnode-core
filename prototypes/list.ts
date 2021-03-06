/**
 * Standart module where other can extends from
 */

console.log("in list")
import {
    exposed
} from "../decerators";
import {
    db
} from "../db";


import * as objectPath from "object-Path";
import {
    Skeleton
} from "../skeleton";
import {
    Bone
} from "../bones/bone";
import {
    Error
} from "../errors";
import {
    conf
} from "../conf";
import * as utils from "../utils";
import {
    cp
} from "fs";

console.log("#utils .. list");
export default class List {
    kindname: any;
    defaultTemplate: string = "list.hbs"
    listTemplate: string = "list.hbs"
    viewTemplate: string = "view.hbs"

    addTemplate: string = "add.hbs"
    addSuccessTemplate: string = "addSuccess.hbs"

    editTemplate: string = "edit.hbs"
    editSuccessTemplate: string = "editSuccess.hbs"
    constructor() {

    }
    classname(_class = this) {
        return _class.constructor.name.toLowerCase();
    }
    /**
     * @param {object} skel is an Instance for a skel to provide the bone Logic
     * @param {object} data All data that can write the Database 
     * 
     * IF /:module/add is an GET Request we Render the add Template
     * IF /:module/add is an POST Request we write the data form the client to the Database
     * 
     * Works on Skel Layer
     * @returns 
     */
    @exposed
    async add({skelData}) {

       
        if (!skelData) {
            throw "no add data"
        }
        var skel = this.addSkel();
        if (!utils.isPostRequest()) {

            //Delete all Bones and Attributes that are not needed
            delete skel.kindname;
            delete skel.type;
            delete skel.key;
            for (const [bonename, bone] of Object.entries(skel)) {
                if (bone) {
                    if (typeof bone === "object") {
                        if (!skel[bonename].visible) {
                            //delete skel[bonename] //?? must we delete it or handel we this client side
                        }
                    }
                } else {
                    delete skel[bonename]
                }
            }

            skel = this.unfoldSkel(skel)
            return this.render(this.addTemplate, skel)
        }
        //Prepare data before we wirting it to the bones
        var modifiedData = this.prepareData(skelData);
        skel = this.unfoldSkel(skel);

        await skel.writeBones(modifiedData, true);
        var success = await skel.toDB();

        if (success) {

            return this.render(this.addSuccessTemplate, skel.readBones())
        }

    }
    @exposed
    async edit({
        key,
        skelData
        }) {
        console.log("in edit=>")
        console.log(key, skelData)
        var skel = this.editSkel();
        if (!utils.isPostRequest()) {
            console.log(await skel.fromDB(key));
             if(!await skel.fromDB(key))
            {
            throw new Error().notFound();
            }
            delete skel.kindname;
            //delete skel.key;
            delete skel.type;
            for (const [bonename, bone] of Object.entries(skel)) {
                if (bone) {
                    if (typeof bone === "object") {
                        if (!skel[bonename].visible) {
                            //delete skel[bonename] //?? must we delet it or handel we this client side
                        }
                    }
                } else {
                    delete skel[bonename]
                }
            }
            skel = this.unfoldSkel(skel);
            return this.render(this.editTemplate, skel)
        }

        //Prepare data before we wirting it to the bones

        var modifiedData = this.prepareData(skelData);


        if(!await skel.fromDB(key))
        {
            throw new Error().notFound();
        }
        skel = this.unfoldSkel(skel)
        await skel.writeBones(modifiedData, true);
        var success = await skel.toDB();
        console.log("is => " + success)
        if (success) {

            return this.render(this.editSuccessTemplate, skel.readBones())
        }
        

    }
    /**
     * 
     * @param {string} key 
     *
     * @returns {Promise} Promies of user
     * Function must clear Password out of the object 
     */
    @exposed
    async view(param) {
        if (param["key"]) {
            var skel = await db.get(this.classname(), param["key"])
            return this.render(this.viewTemplate, skel);
        } else {
            console.log("no key in view")
            throw new Error().notFound();
        }
    }
    /**
     *
     * @returns {object} Object of user
     * Function must clear Password out of the object 
     */
    @exposed
    async list() {
        let skellist = await db.list(this.classname());
        let structure = this.viewSkel();
        delete structure.kindname;
        delete structure.type;
        let data = {
            "values": skellist,
            "structure": structure
        }
        return this.render(this.listTemplate, data);
    }

    /**
     * 
     * @param data 
     * @param template If html the Site to render
     */
    render(template = this.listTemplate, skel = {}) {
        let renderer = utils.getCurrentRender();
        switch (utils.getCurrentRenderName()) {
            case "json":
                return renderer.render(skel)
            case "html":
                return [template, skel]
            default:
                break;
        }
    }

    /**
     * 
     * @param data 
     * @returns modifiedData
     * Options for the Names:
     * {"boneName":boneData} will be  {"boneName":boneData}
     * //Mulitple
     * {"boneName:0":boneData} will be  {"boneName":[boneData]}
     * if
     * {"boneName.1":boneData1} will be  {"boneName":[boneData,boneData1]}
     * 
     * //Record
     * {"recordBoneName.otherBoneName":boneData} will be  {"recordBoneName":{"otherBoneName":boneData}}
     * 
     */
    prepareData(data) {
        console.log("prepare data ")
        var modifiedData = {}
        for (const [boneName, boneData] of Object.entries(data)) {

            //console.log(objectPath.has(modifiedData,boneName))
            if (!objectPath.has(modifiedData, boneName)) {
                objectPath.set(modifiedData, boneName, boneData)
            } else {
                objectPath.insert(modifiedData, boneName, boneData)
            }
        }
        return modifiedData;

    }
    unfoldSkel(skel: Skeleton) {
        var modifiedData = skel;
        for (const [boneName, boneArgs] of Object.entries(skel)) {
            if (boneArgs) {
                if (!boneArgs.readonly) {// We not accept data that is readonly
                    if (boneArgs.type == "record") {
                        boneArgs.using = this.unfoldSkel(new boneArgs.using());
                        modifiedData[boneName] = boneArgs;
                    } else {
                        modifiedData[boneName] = boneArgs
                    }
                }
            }

        }
        
        return modifiedData;
    }
    // Get Skeleton by KindName
    viewSkel() {
        return this.getSkelByName(this.classname()); 

    }
    addSkel() {
        return this.getSkelByName(this.classname()); 

    }
    editSkel() {
        return this.getSkelByName(this.classname()); 
    }
    loginSkel() {
        return this.getSkelByName(this.classname());

    }
    getSkelByName(name:string)
    {

        for (const [skelName, skel] of Object.entries(conf["skeletons"])) {

            if (name == skelName) {
            
                return  this.createInstance(skel);
                
            }
        }
       
       
    }
    createInstance(x)
    {
        return new x();
    }
}