declare module '*.png' {
  const value: string;
  export default value;
}

declare const process: {
  env: Record<string, string | undefined>;
};
