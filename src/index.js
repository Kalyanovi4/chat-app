const { server } = require('./app');

// const port = process.env.PORT || 3000;

server.listen(process.env.PORT || 3000, () => {
  console.log(`Server is running on port ${process.env.PORT}`);
});