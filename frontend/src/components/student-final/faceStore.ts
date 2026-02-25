let savedDescriptor: Float32Array | null = null;

export const setFaceDescriptor = (descriptor: Float32Array) => {
  savedDescriptor = descriptor;
};

export const getFaceDescriptor = () => savedDescriptor;
