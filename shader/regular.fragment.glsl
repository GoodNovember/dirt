precision mediump float;
uniform sampler2D image;
varying vec2 vertex_textureCoordinates;
void main() {   gl_FragColor = texture2D(image, vertex_textureCoordinates);   }