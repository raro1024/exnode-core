
class Bone {
    constructor() {
        this._value;
        
    }

    classname(_class = this) {
        console.log(_class.constructor.name)
    }

   get data()
   {
       return this._value;
   }
   set data(_val)
   {
       this._value;
   }
  



}
module.exports = Bone;