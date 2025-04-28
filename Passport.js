// Passport configuration
passport.use(new LocalStrategy({
  usernameField: 'email',
  passwordField: 'password'
}, async (email, password, done) => {
  try {
    const user = await User.findOne({ email }).select('+password');
    
    if (!user) {
      return done(null, false, { message: 'Incorrect email or password' });
    }
    
    const isMatch = await user.correctPassword(password, user.password);
    if (!isMatch) {
      return done(null, false, { message: 'Incorrect email or password' });
    }
    
    // Проверяем, подтвержден ли email
    if (!user.emailVerified) {
      return done(null, false, { message: 'Please verify your email first' });
    }
    
    return done(null, user);
  } catch (err) {
    return done(err);
  }
}));

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err);
  }
});
