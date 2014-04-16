define([
        'underscore',
        'event-emitter',
        './http-client',
        './priority-queue'],
    function (_, EventEmitter, HttpClient, PriorityQueue) {

        /**
         * Generates an RFC4122-compliant GUID.
         * See http://stackoverflow.com/questions/105034/how-to-create-a-guid-uuid-in-javascript.
         * @returns {String} A unique RFC4122-compliant GUID.
         */
        var _generateGuid = function () {
            return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,
                function (c) {
                    var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
                    return v.toString(16);
                }).toUpperCase();
        };

        /**
         * Compares the priority of two http requests and decides which is higher priority.
         * @param {Object} a The left operand.
         * @param {Object} b The right operand.
         * @return {Number} The result of the comparison of the two requests.
         */
        var _requestPriorityComparer = function (a, b) {
            if (a.priority === b.priority) {
                return 0;
            }
            if (a.priority > b.priority) {
                return 1;
            }
            return -1;
        };

        var restque = function () {
            this._http_client = new HttpClient();
            this._queue = new PriorityQueue(_requestPriorityComparer);
            this._id = _generateGuid();
            this._requests_in_progress = {};
            this._requests_in_progress_count = 0;
            this._max_requests = 2;
            this._queue_timer_interval = 500;
        };

        restque.prototype = Object.create(EventEmitter.prototype);

        restque.prototype._setQueueTimer = function () {

            if (this._processQueueTimer) {
                clearTimeout(this._processQueueTimer);
            }

            var self = this;
            this._processQueueTimer = setTimeout(
                function () {
                    self._processQueue.call(self, false);
                },
                this._queue_timer_interval);
        };

        restque.prototype._shouldProcessQueue = function () {

            var should_process = true;

            if (this._queue.peek() === null) { // There's nothing to process
                should_process = false;
            } else if (this._requests_in_progress_count >= this._max_requests) { // Max requests are in progress
                should_process = false;
            }

            return should_process;
        };

        restque.prototype._processQueue = function (kicked) {

            while (this._shouldProcessQueue()) {
                var next_request = this._queue.next();
                if (!next_request.is_cancelled) {
                    this._doRequest(next_request);
                }
            }

            if (!kicked) {
                this._setQueueTimer();
            }
        };

        restque.prototype._kickQueue = function () {
            this._processQueue(true);
        };

        restque.prototype._requestCompleted = function (err, request, response) {

            this._requests_in_progress_count--;
            if (this._requests_in_progress[request.id]) {
                delete(this._requests_in_progress[request.id]);
            }

            if (!request.is_cancelled && response.status_code === 401) {
                this.trigger('authentication_required', [request, response]);
            } else if (!request.is_cancelled && _.isFunction(request.done)) {

                if (!request.quiet && (err || (response.status_code !== 200 && response.status_code !== 201))) {
                    this.trigger('request_failed', [request, response]);
                }

                if (request.context) {
                    request.done.apply(request.context, [err, request, response]);
                } else {
                    request.done(err, request, response);
                }
            }
        };

        restque.prototype._doRequest = function (request) {
            request.handle = this._http_client.request(request, this, this._requestCompleted);
            this._requests_in_progress[request.id] = request;
            this._requests_in_progress_count++;
        };

        restque.prototype._queueRequest = function (method, url, data, options, done) {

            if (_.isFunction(options)) {
                done = options;
                options = null;
            }

            options = options || {};

            var request = {
                id: _generateGuid(),
                url: url,
                method: method,
                data: data,
                priority: options.priority || 1,
                done: done,
                context: options.context,
                timeout: options.timeout,
                restque_id: this._id,
                is_cancelled: false,
                quiet: options.quiet || false
            };

            this._queue.add(request);
            this._kickQueue();
            return request.id;
        };

        /**
         * Gets a new restque instance that shares the same underlying queue as this instance.
         * Requests sent via the new instance can be cancelled as a set without affecting requests
         * sent through other restque instances.
         */
        restque.prototype.taggedRestque = function () {
            // Create a new restque instance which will have its own unique id.
            // Set the queue and http client to the same as this instance so the underlying queue is shared.
            var tagged_restque = new restque();
            tagged_restque._queue = this._queue;
            tagged_restque._http_cleint = this._http_client;
            return tagged_restque;
        };

        restque.prototype._cancelRequest = function (request) {
            request.is_cancelled = true;
            if (request.handle) {
                request.handle.abort();
            }
        };

        restque.prototype.cancel = function () {

            var key,
                request;
            for (key in this._requests_in_progress) {
                if (this._requests_in_progress.hasOwnProperty(key)) {
                    request = this._requests_in_progress[key];
                    if (request.restque_id === this._id) {
                        this._cancelRequest(request);
                        delete this._requests_in_progress[key];
                        this._requests_in_progress_count--;
                    }
                }
            }

            var i,
                found = false;
            for (i = 0; i < this._queue.count(); i++) {

                request = this._queue.peekAtIndex(i);
                if (request.restque_id === this._id) {
                    this._cancelRequest(request);
                    this._queue.removeAtIndex(i);
                    found = true;
                    break;
                }
            }

            if (found) {
                this.cancel();
            }
        };

        restque.prototype.get = function (url, options, done) {
            this._queueRequest('GET', url, null, options, done);
        };

        restque.prototype.post = function (url, data, options, done) {
            this._queueRequest('POST', url, data, options, done);
        };

        restque.prototype.put = function (url, data, options, done) {
            this._queueRequest('PUT', url, data, options, done);
        };

        restque.prototype.delete_ = function (url, options, done) {
            this._queueRequest('DELETE', url, null, options, done);
        };

        if (!window.restque) {
            window.restque = new restque();
        }

        return window.restque;
    }
);