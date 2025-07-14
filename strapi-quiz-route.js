module.exports = {
  routes: [
    {
      method: 'POST',
      path: '/api/quiz/submit',
      handler: 'quiz.submit',
      config: {
        auth: false, // This makes the endpoint public
        policies: [],
        middlewares: [],
      },
    },
  ],
}; 