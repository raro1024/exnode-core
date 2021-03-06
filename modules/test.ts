import {
    Skeleton,
    RefSkeleton
} from "../skeleton";
import * as seckey from "../seckey"
import List from "../prototypes/list";

import {
    exposed, startUpTask
} from "../decerators";


export class Test extends List {
    kindname="test"
    constructor() {
        super();
    }
    @exposed
    async add(skelData) {
        return super.add( skelData);
    }
    @exposed
    async edit(key:string,skelData:object) {
        return super.edit(key,skelData);
    }

}