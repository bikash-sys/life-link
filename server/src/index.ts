import app from './app.js';

const PORT = process.env.PORT || 5001;

app.listen(PORT, () => {
  console.log(`[LifeLink API] Server listening on port ${PORT}`);
  console.log(`[LifeLink API] Health check ready at http://localhost:${PORT}/health`);
});
