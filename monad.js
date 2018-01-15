var MonadGenerator = function () {
    var prototype = Object.create(null);
    function Unit(value) {
        var monad = Object.create(prototype);
        monad.bind = function () {
            var args = Array.prototype.slice.call(arguments);
            var fn = args[0];
            args.splice(0, 1);
            return fn.apply(undefined, [value].concat(args));
        }
        return monad;
    }
    Unit.register = function (name, fn) {
        prototype[name] = function () {
            var args = Array.prototype.slice.call(arguments);
            args.splice(0, 0, fn);
            return this.bind.apply(this, args);
        };
        return Unit;
    }
    return Unit;
}


//Records monad - functional utility to traverse data set of identical records (like a set of rows from the same table)
var Records = MonadGenerator();

function extractAttribute(records, attribName) {
    return records.map(function (record, index, all, ) {
        return record[attribName];
    });
}

Records.register("ExtractAttribute", extractAttribute);

var list = [{ name: "David", age: 32 }, { name: "John", age: 35 }];
var myRecords = Records(list);

myRecords.ExtractAttribute("age");
