let savedDescriptor: Float32Array | null = null;

export const setFaceDescriptor = (desc: Float32Array) => {
  savedDescriptor = desc;
};

export const getFaceDescriptor = () => {
  return savedDescriptor;
};
