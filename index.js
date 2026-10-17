
const express = require("express");
const morgan = require("morgan");
const app = express();
// Express stores middleware and route handlers in an ordered stack. They execute in the order they are registered, provided they match the incoming request.
// For example, if Middleware 1, Middleware 2, and Middleware 3 are registered in that order, visiting / executes them in the same order, provided each calls next() and matches the request.
// The next() function tells Express to continue forward through the stack to find the next applicable middleware or route handler. You do not specify which middleware executes next; Express manages this automatically.

// built in middleware json static and urlencoded
//express.json() middleware
app.use(express.json()); // Parses incoming JSON data

//express.static middleware
app.use(express.static("publicxx"));//all file inside this publicxx folder become route so we can acess them directly without creating separte route to access them
// we dont need to do this below
// app.get("/hello.txt", (req, res) => {
//   res.sendFile(__dirname + "/public/hello.txt");
// });
// express.urlencoded
app.use(express.urlencoded({ extended: true })); //parse URL-encoded form data, exteded true to read nested form data

// third party middle ware Morgan middleware, cors
app.use(morgan("dev"));      // Logs method, endpoint, status code, response time
app.use(morgan("combined")); // Logs IP, date/time, method, endpoint, status, response size, and user-agent

// application-level middleware -> Middleware must have (req,res) or (req,res,next),it can run for all incoming requests, depending on its position in the middleware stack.
app.use((req, res, next) => {
    console.log("Middleware executed to track ip");
    console.log("ip:", req.ip);
    console.log("--------------------");
    // res.send('namaste') //either return res.send
    next();//or pass control else page will load continously and never go to '/' path in this case
});
// Middleware 2
app.use((req, res, next) => {
    console.log("Middleware 2 executed to track method and url");
    console.log("Method:", req.method);
    console.log("originalURL:", req.originalUrl)
    console.log("--------------------");

    //  res.send('hello')
    next();
});
//validation middleware
app.use((req, res, next) => {
    const age = Number(req.query.age)
    if (age < 18) return res.send('become adult to visit')
    next()
})
// Route
app.get("/", (req, res) => {
    res.send("Hello Abhishek!");
});
// Route
app.get("/contact", (req, res) => {
    res.send("contact me for web development");
});
// route for parsing
app.post('/bio', (req, res) => {
    res.json({ data: req.body })
})
// adult route
app.get('/adult', (req, res) => {
    res.send('you are adult')
})
// application-level middleware on specific path-> Middleware runs only for routes starting with /user i.e /user or /user/123 or /user?age=89
const userMiddleware1 = (req, res, next) => {
    console.log("user Middleware 1 private executed");
    next();
};
const userMiddleware2 = (req, res, next) => {
    console.log("user Middleware 2 private executed");
    next();
};
app.use("/user", userMiddleware1, userMiddleware2);

app.get("/user", (req, res) => {
    res.send("User page");
});

app.get("/user/123", (req, res) => {
    res.send("User 123 page");
});
// Route-specific middleware -> middle ware for only one specific path including query strings.,to perform tasks like validating input, checking authentication, or verifying permissions
const checkMiddleware1 = (req, res, next) => {
    console.log("Middleware 1 private executed");
    next();
};
const checkMiddleware2 = (req, res, next) => {
    console.log("Middleware 2 private executed");
    next();
};
app.get("/private", checkMiddleware1, checkMiddleware2, (req, res) => {
    res.send(`Bio page ${req.query.age}`);
});
//next route even skip route handler in this case 
app.get("/party", (req, res, next) => { next('route') }, checkMiddleware1, checkMiddleware2, (req, res) => {
    res.send(`Bio page ${req.query.age}`);
});
// route handler using next() , route handler behave like middleware
// both routes must use /user and the GET method, so next() passes control to the second matching route handler.
app.get("/hero", (req, res, next) => {
    console.log("Route 1");
    next();
});

app.get("/hero", (req, res) => {
    res.send("Route 2 response");
});
//next route even skip route handler in this case and also move to /user
app.get("/user99", (req, res, next) => {
    console.log("Handler 1");
    next("route");
},
    (req, res) => {
        res.send("Handler 2"); // Skipped
    }
);

app.get("/user99", (req, res) => {
    res.send("Second route"); // Executes
});
// next() will call the below middleware because next find nearest middleware or route handler
app.get("/", (req, res, next) => {
    console.log("Route handler");
    next();
});

app.use((req, res, next) => {
    console.log("Middleware below the route");
    res.send("Home page");
});
// next() → Passes control to the next matching middleware or route handler in the normal flow.,can be used in both middleware and route handlers.
//next(error) ->Passes an error to Express error-handling middleware, skipping the remaining normal middleware and route handlers,can be used in both middleware and route handlers.
// next("route") → route is fixed keyword,Skips the remaining handlers of the current route and moves to the next matching route. It is used inside route handlers registered with methods like app.get() or app.post(), not middleware registered with app.use().

//Error-handling middleware must have four parameters signature in this order: (err, req, res, next). you cant skip next 
app.get("/pepsi", (req, res, next) => {
    //way 1
    try {
        throw new Error("Something went wrong");
    } catch (err) {
        next(err);
    }
    // way 2
    next(new Error("Something went wrong"));//from error middleware 2 err.message will print something went wrong on browser route pepsi
});
// Error-handling middleware 1
app.use((err, req, res, next) => {
    console.log("Error middleware 1");
    next(err);
});
// Error-handling middleware 2
app.use((err, req, res, next) => {
    console.log("Error middleware 2");
    res.status(500).send(err.message);
});

//Centralized error-handling middleware- if we have only one error handling middleware and it is not using next

// 1. Async middleware using app.use()
app.use(async (req, res, next) => {
    await Promise.resolve();
    console.log("Middleware executed");
    next();
});


// 2. Async route using app.get()
app.get("/", async (req, res, next) => {
    try {
        const message = await Promise.resolve("Hello");
        res.send(message);
    } catch (error) {
        next(error);
    }
});
//server listening
app.listen(5000, () => {
    console.log("Server running on port 5000");
});
