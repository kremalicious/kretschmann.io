'use strict'

// manually require modules that won"t get picked up by gulp-load-plugins
var gulp = require('gulp'),
    del = require('del'),
    chalk = require('chalk'),
    parallelize = require('concurrent-transform');

// load plugins
var $ = require('gulp-load-plugins')();

// Temporary solution until gulp 4
// https://github.com/gulpjs/gulp/issues/355
var runSequence = require('run-sequence');

// handle errors
var onError = function(error) {
    console.log(chalk.red('You fucked up:', error.message, 'on line' , error.lineNumber));
}

var src       = 'src/',
    dist      = 'dist/';

//
// clean everything
//
gulp.task('clean', function (cb) {
    return del([
        dist + '**/*'
    ], cb);
});


//
// Styles
//
gulp.task('css', function () {
    return gulp.src(src + 'less/kretschmannio.less')
        .pipe($.less()).on('error', onError)
        .pipe($.autoprefixer({ browsers: 'last 2 versions' }))
        .pipe($.cssmin())
        .pipe($.rename({suffix: '.min'}))
        .pipe(gulp.dest(dist + 'assets/css'))
        .pipe($.connect.reload());
});


//
// Copy everything
//
gulp.task('copy', function () {
    return gulp.src([
        src + '**/*',
        '!' + src + 'less/**/*'
    ])
    .pipe(gulp.dest(dist));
});


//
// Optimize HTML
//
gulp.task('optimize:html', function() {
  return gulp.src(dist + '**/*.html')
    .pipe($.htmlmin({
        collapseWhitespace: true,
        conservativeCollapse: true,
        removeComments: true,
        useShortDoctype: true,
        collapseBooleanAttributes: true,
        removeRedundantAttributes: true,
        removeEmptyAttributes: true
    }))
    .pipe(gulp.dest(dist));
});


//
// Revision static assets
//
gulp.task('revision', function () {
    return gulp.src(dist + '**/*.{css,js,png,jpg,jpeg,svg,gif}')
        .pipe($.rev())
        .pipe(gulp.dest(dist))
        // output rev manifest for next replace task
        .pipe($.rev.manifest())
        .pipe(gulp.dest(dist + 'assets'));
});


//
// Replace all links to assets in files
// from a manifest file
//
gulp.task('revision-replace', function () {

    var manifest = gulp.src(dist + 'assets/rev-manifest.json');

    return gulp.src(dist + '**/*.{json,html,css}')
        .pipe($.revReplace({manifest: manifest}))
        .pipe(gulp.dest(dist));
});


//
// Dev Server
//
gulp.task('connect', function () {
    return $.connect.server({
        root: [dist],
        livereload: true,
        port: 1337
    });
});


//
// Watch task
//
gulp.task('watch', function () {
    gulp.watch([src + 'less/**/*.less'], ['css']);
});


//
// rsync Deployment
//
gulp.task('deploy', function() {
    return gulp.src(dist)
        .pipe($.rsync({
            root: dist,
            hostname: 'kretschmann',
            destination: '/var/www/kretschmann.io/html',
            recursive: true,
            clean: true
        }));
});


// ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
// Task sequences
// ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^


//
// gulp
//
gulp.task('default', ['css', 'copy', 'watch', 'connect']);


//
// gulp build: Production build
//
gulp.task('build', function (callback) {
    runSequence(
        'clean',
        ['css', 'copy'],
        'revision',
        'revision-replace',
        'optimize:html',
        callback
    );
});
