/**
 * Home Module Controller
 * Handles the application's landing page and navigation
 */

/**
 * Render the home page
 */
exports.index = async (req, res) => {
  try {
    res.render('modules/home/home', {
      title: 'Register Team Internal Services',
      user: req.user
    });
  } catch (error) {
    console.error('Error in home controller:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'An error occurred while loading the home page',
      error: process.env.NODE_ENV === 'development' ? error : {},
      user: req.user
    });
  }
};
