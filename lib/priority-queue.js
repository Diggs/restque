define([
    'underscore'],
    function (_) {

        var comparison_result = {
            ascending: -1,
            same: 0,
            descending: 1
        };

        var priority_queue = function (comparer) {
            this._queue = [];
            this._comparer = comparer || function () {return comparison_result.same;}
        };

        priority_queue.prototype = {

            /**
             * Compares two objects using the supplied comparer function and returns a
             * ComparisonResult.
             * @param {Object} a The left operand.
             * @param {Object} b The right operand.
             * @returns {Number} A comparison result from comparing the two objects.
             */
            _compareObjects: function (a, b) {
                return this._comparer(a, b);
            },

            /**
             * Bubbles the object at the specified index up the queue
             * until it encounters an object that is the same or greater than itself.
             * @param {int} index The index of the object to bubble up.
             */
            _bubbleUpFrom: function (index) {

                var parentIndex = null,
                    parentObject = null,
                    object = null;

                while (0 < index) {

                    parentIndex = index - 1;
                    parentObject = this._queue[parentIndex];
                    object = this._queue[index];

                    if (this._compareObjects(parentObject, object) < comparison_result.same) {
                        this._queue[index] = parentObject;
                        this._queue[parentIndex] = object;
                        index = parentIndex;
                    } else {
                        break;
                    }
                }
            },

            /**
             * Bubbles the object at the specified index down the queue
             * until it encounters an object that is the same or less than itself.
             * @param {int} index The index of the object to bubble down.
             */
            _bubbleDownFrom: function (index) {

                var endIndex = this._queue.length - 1,
                    childIndex = null,
                    childObject = null,
                    object = null;

                while (index < endIndex) {

                    childIndex = index + 1;
                    childObject = this._queue[childIndex];
                    object = this._queue[index];

                    if (this._compareObjects(childObject, object) > comparison_result.same) {
                        this._queue[index] = childObject;
                        this._queue[childIndex] = object;
                        index = childIndex;
                    } else {
                        break;
                    }
                }
            },

            /**
             * Adds an object to the queue.
             * @param {Object} object The object to add.
             */
            add: function (object) {
                var objectIndex = this._queue.push(object) - 1;
                this._bubbleUpFrom(objectIndex);
                //_queueSizeChanged.trigger({queueSize: this.count()});
            },

            /**
             * Removes an object from the queue.
             * @param {Object} object The object to remove.
             */
            remove: function (object) {

                var foundObject = false,
                    objectIndex = 0,
                    i = 0;

                for (i = 0; i < this._queue.length; i++) {
                    if (this._queue[i] === object) {
                        foundObject = true;
                        objectIndex = i;
                        break;
                    }
                }

                if (foundObject) {
                    this.removeAtIndex(objectIndex);
                }
            },

            /**
             * Retrieves the next object from the queue, removing it
             * from the queue in the process.
             * @returns The next object or null if the queue is empty.
             */
            next: function () {
                if (this._queue.length <= 0) {
                    return null;
                } else {
                    var object = this.peek();
                    this.removeAtIndex(0);
                    return object;
                }
            },

            /**
             * Returns the next object from the queue
             * without removing it from the queue.
             * @returns The next object or null if the queue is empty.
             */
            peek: function () {
                if (this._queue.length <= 0) {
                    return null;
                } else {
                    return this._queue[0];
                }
            },

            /**
             * Returns the object at the specified index from the queue
             * without removing it from the queue.
             * @param {int} index The index of the object to return.
             * @returns The object at the specified index or null if the index is out
             * of bounds.
             */
            peekAtIndex: function (index) {
                if (this._queue.length < index || index < 0) {
                    return null;
                } else {
                    return this._queue[index];
                }
            },

            /**
             * Removes the object at the specified index from the queue.
             * If the index is out of bounds this is a no op.
             * @param {int} index The index of the object to remove.
             */
            removeAtIndex: function (index) {
                if (this._queue.length >= index && index >= 0) {
                    if (index < this._queue.length - 1) {
                        this._queue[index] = this._queue[this._queue.length - 1];
                    }

                    this._queue.pop();
                    this._bubbleDownFrom(index);
                }
            },

            /**
             * Returns the number of objects in the queue.
             */
            count: function () {
                return this._queue.length;
            }
        };

        return priority_queue;
    }
);