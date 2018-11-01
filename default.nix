with import <nixpkgs> {};
stdenv.mkDerivation {
  name = "env";
  buildInputs = [
    nodejs-10_x
    unstable.yarn
  ];
}
