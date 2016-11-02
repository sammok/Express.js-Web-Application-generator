var gulp = require('gulp');
var spawn = require('child_process').spawn;
var node;

// --------------------------------------------------------------------------------------------------- //
//  #desc: task command
gulp.task('help',function () {
    console.log('\t$ gulp develop\t\tWatch files, auto restart Server when listened targets changed.');
});

//  #desc: default
gulp.task('default',function () {
    gulp.start('help');
});

/**  develop tasks */
//  #desc: Watch
gulp.task('develop', function() {
    gulp.start('watch'); 
});

//  #desc: Watch css, js
gulp.task('watch', function() {
    gulp.run('server');
    gulp.watch(['core/**/**/**/*', '!node_modules/', '!core/public/uploads/**/*'])
       .on('change', function () {
           gulp.run('server');
       });
});

gulp.task('server', function () {
    if (node) node.kill();
    var env = Object.create( process.env );
    env.NODE_ENV = 'develop';

    node = spawn('node', ['core/app.js'], {stdio: 'inherit', env: env});
    node.on('close', function (code) {
        if (code === 8) {
            gulp.log('Error detected, waiting for changes...');
        }
    });
});


