attribute vec4 position;
uniform mat4 matrix;
attribute vec2 textureCoordinates;
varying highp vec2 vertex_textureCoordinates;

void main() {
    gl_Position = matrix * position;
    vertex_textureCoordinates = textureCoordinates;
}