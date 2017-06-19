module.exports = function(grunt) {
  grunt.initConfig({
    pkg: require('./package'),
    jsonlint: {
      packagejson: {
        src: 'package.json'
      }
    },
    exec: {
      mocha: {
        options: [
          '--reporter spec',
          '--colors',
          '--recursive'
        ],
        cmd: './node_modules/.bin/mocha <%= exec.mocha.options.join(" ") %>'
      }
    },
    keycode: {
      generate: {
        dest: 'src/adb/keycode.coffee'
      }
    }
  })

  grunt.loadNpmTasks('grunt-jsonlint')
  grunt.loadNpmTasks('grunt-exec')
  grunt.loadTasks('./tasks')

  grunt.registerTask('test', ['jsonlint', 'exec:mocha'])
  return grunt.registerTask('default', ['test'])
}
