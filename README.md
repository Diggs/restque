## restque

### What?

A priority queue for managing HTTP requests in single page web apps.

### Why?

***Speed***

Web browsers will only initiate up to 2 HTTP requests per domain at any given time. A modern single page web app will
commonly need to send more than 2 HTTP requests to render view(s). Some of these requests are more important than others as
their completion has a direct impact on the perceived speed of the page.

Also, as a user navigates between views in a single page app, each view will typically initiate the HTTP requests
needed to populate itself, unaware that the user may have already clicked another link which has caused a new view to
be loaded, rendering the previous views in-progress HTTP requests obsolete. In this situation the browsers built-in
queue will be clogged with requests from the old view that must complete before any of the requests needed to populate
the new view can be sent.

Restque then serves 2 main functions in the pursuit of a better user experience:

1. Restque allows HTTP requests to be prioritized and will send the highest priority requests first.
2. Restque makes it trivial to cancel a batch of HTTP requests, freeing the browser to respond to the user quicker.

## How?

Consider the simple backbone.js example below:

``` javascript
define([
    'backbone',
    'underscore'
    'restque',
    'text!views/games/templates/games.ejs'],
    function (Backbone, _, Restque, GamesTemplate) {

        return Backbone.View.extend({

            // Get a unique restque to send requests through
            restque: Restque.taggedRestque(),

            initialize: function () {
                // Render the initial view immediately, not waiting for any HTTP requests
                this.render();
                // After initial rendering send an HTTP request to fetch data to populate the view with
                this.getScores();
            },

            render: function () {

                var template = _.template(GamesTemplate, {});

                $(template)
                    .appendTo(this.el);
            },

            getScores: function() {

                // Use restque to perform an HTTP GET, specifying the highest priority for the request as the user is
                // actively waiting for this
                this.restque.get(
                    '/scores',
                    {
                        context: this,
                        priority: 1
                    },
                    function (err, req, res) {
                        if (err) {return;}
                        this.renderScores(res.body);
                    });
            },

            renderScores: function(scores) {
                ...
            },

            close: function () {
                // When this view is closed, cancel requests that are queued or in-progress as they are no longer needed
                this.restque.cancel();
                this.remove();
                this.unbind();
            }
        });
    });
```

In the code above we use a unique restque instance to send the request needed to populate the view - each restque instance tracks the requests sent through it, so they can all be cancelled at once if needed. An HTTP GET is then sent via the restque instance with a high priority to ensure it is sent as soon as possible. Finally when the view is closed the ```cancel()``` function is called on the restque instance to ensure that if the request hasn't completed by the time the user navigates to another view the new view will be able to send its own requests immediately.

This is a very simple example, typically there will be more than one HTTP request that needs to be sent on a view, and often background polling may be occurring (which can be assigned a low priority) as well. There may also be more than one view displayed at any given time, depending on how modular the application is.


## API

### Functions

TAGGED RESTQUE - Creates a restque
```
restque.taggedRestque()

returns a unique restque instance.
```

GET - performs a standard HTTP GET
```
restque.get(url, options, done)

url - the url of resource to perform an HTTP GET on.
options.priority - the priority of the request, 1, 2 or 3. Default 1. Lower is more important.
options.timeout - the time in milliseconds the request should be allowed to run for before being aborted.
options.quiet - true if the global error event should not be called if this request fails.
options.context - the object to set as 'this' when calling done.
done - a function that will be called on success or failure of the request.
```

PUT - performs a standard HTTP PUT
```
restque.put(url, data, options, done)

url - the url of resource to perform an HTTP PUT on.
data - the object to send as JSON to the server.
options.priority - the priority of the request, 1, 2 or 3. Default 1. Lower is more important.
options.timeout - the time in milliseconds the request should be allowed to run for before being aborted.
options.quiet - true if the global error event should not be called if this request fails.
options.context - the object to set as 'this' when calling done.
done - a function that will be called on success or failure of the request.
```

POST - performs a standard HTTP POST
```
restque.post(url, data, options, done)

url - the url of resource to perform an HTTP POST on.
data - the object to send as JSON to the server.
options.priority - the priority of the request, 1, 2 or 3. Default 1. Lower is more important.
options.timeout - the time in milliseconds the request should be allowed to run for before being aborted.
options.quiet - true if the global error event should not be called if this request fails.
options.context - the object to set as 'this' when calling done.
done - a function that will be called on success or failure of the request.
```

DELETE - performs a standard HTTP DELETE
```
restque.delete(url, options, done)

url - the url of resource to perform an HTTP DELETE on.
options.priority - the priority of the request, 1, 2 or 3. Default 1. Lower is more important.
options.timeout - the time in milliseconds the request should be allowed to run for before being aborted.
options.quiet - true if the global error event should not be called if this request fails.
options.context - the object to set as 'this' when calling done.
done - a function that will be called on success or failure of the request.
```

CANCEL - cancels all queued and in-progress requests that were queued via this restque instance
```
restque.cancel()
```

### EVENTS

AUTHENTICATION REQUIRED - called when a request sent via any restque instance fails with a 401. Typically used as an opportunity to redirect to a log in page.
```
Restque.on('authentication_required', function (req, res) {

});
```

REQUEST FAILED - called when a request sent via any restque instance fails. Typically used to log the error and/or show a standard error message to a user.
```
Restque.on('request_failed', function (req, res) {

});
```

## Using restque in your app

Currently restque depends on an AMD compatible module loader, a requirejs example is below that should be able to be adapted for other loaders:

```
require.config({
    baseUrl: "js/",
    paths: {
        jquery: 'restque/vendor/jquery-2.0.2.min',
        underscore: 'restque/vendor/underscore-1.4.4.min',
        'event-emitter': 'restque/vendor/event-emitter.4.0.3.min',
        restque: 'restque/lib/restque'
    }
});
```

Restque depends on jquery, underscore and event-emitter, each of which are included in the ```vendor``` directory. You may use your own copies of these if you're already loading them in your application.