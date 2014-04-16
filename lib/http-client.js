define([
    'jquery',
    'underscore'],
    function ($, _) {

        var http_client = function () {

        };

        http_client.prototype = {

            /**
             * Parses the response to an HTTP request to JSON.
             * If parsing fails the original response string will be returned.
             */
            _parseResponse: function (jqXHR) {
                try {
                    return JSON.parse(jqXHR.responseText)
                } catch (e) {
                    return jqXHR.responseText;
                }
            },

            /**
             * Parses a string of HTTP headers to a dictionary of key/values.
             * @param {string} httpHeaders The HTTP headers string to process.
             * @returns {Object} The HTTP headers as a dictionary of key/values.
             */
            _parseHttpHeaders: function (httpHeaders) {

                var headerRegex = /^(.*?):[ \t]*([^\r\n]*)\r?$/mg;
                var match;
                var headers = {};

                while (true) {
                    match = headerRegex.exec(httpHeaders);
                    if (!match) {
                        break;
                    } else {
                        headers[match[1].toLowerCase()] = match[2];
                    }
                }

                return headers;
            },

            /**
             * Performs an http request.
             * @param {String} request The request to execute.
             * @param {Object} context The object to set as 'this' when calling done.
             * @param {Function} done Called on success and error.
             */
            request: function (request, context, done) {

                var self = this;

                return $.ajax({
                        url: request.url,
                        accept: "application/json",
                        contentType: request.data ? "application/json" : "",
                        dataType: "text",
                        type: request.method,
                        async: true,
                        data: request.data ? JSON.stringify(request.data) : null,
                        timeout: request.timeout || 10000,
                        processData: false,
                        cache: false,
                        complete: function (jqXHR, textStatus) {

                            var response = {
                                status_code: jqXHR.status,
                                body: self._parseResponse(jqXHR),
                                headers: self._parseHttpHeaders(jqXHR.getAllResponseHeaders())
                            };

                            if (jqXHR.status === 401 || textStatus === "success" ||
                                textStatus === "nocontent" || textStatus === "parsererror") {
                                done.call(context, null, request, response);
                            } else {
                                done.call(context, new Error(textStatus), request, response);
                            }
                        }}
                );
            }
        };

        return http_client;
    }
);