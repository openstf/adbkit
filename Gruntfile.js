(function() {
  module.exports = function(grunt) {
    grunt.initConfig({
      pkg: require('./package'),
      clean: {
        lib: {
          src: 'lib'
        },
        index: {
          src: 'index.js'
        }
      },
      jshint: {
        all: ['Gruntfile.js', 'index.js', 'src/**/*.js', 'test/**/*.js', 'tasks/**/*.js', 'bench/**/*.js']
      },
      jsonlint: {
        packagejson: {
          src: 'package.json'
        }
      },
      watch: {
        src: {
          files: '<%= coffee.src.cwd %>/<%= coffee.src.src %>',
          tasks: ['coffeelint:src', 'test']
        },
        index: {
          files: '<%= coffee.index.src %>',
          tasks: ['coffeelint:index', 'test']
        },
        test: {
          files: '<%= coffeelint.test.src %>',
          tasks: ['coffeelint:test', 'test']
        },
        gruntfile: {
          files: '<%= coffeelint.gruntfile.src %>',
          tasks: ['coffeelint:gruntfile']
        },
        packagejson: {
          files: '<%= jsonlint.packagejson.src %>',
          tasks: ['jsonlint:packagejson']
        }
      },
      exec: {
        mocha: {
          options: ['--compilers coffee:coffee-script/register', '--reporter spec', '--colors', '--recursive'],
          cmd: './node_modules/.bin/mocha <%= exec.mocha.options.join(" ") %>'
        }
      },
      keycode: {
        generate: {
          dest: 'src/adb/keycode.coffee'
        }
      }
    });
    grunt.loadNpmTasks('grunt-contrib-clean');
    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-jsonlint');
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-notify');
    grunt.loadNpmTasks('grunt-exec');
    grunt.loadTasks('./tasks');
    grunt.registerTask('test', ['jsonlint', 'jshint', 'exec:mocha']);
    // grunt.registerTask('build', ['coffee']);
    return grunt.registerTask('default', ['test']);
  };

}).call(this);
