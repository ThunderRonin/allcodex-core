{
  description = "Trilium Notes (experimental flake)";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs";
    flake-utils.url = "github:numtide/flake-utils";
    pnpm2nix = {
      url = "github:FliegendeWurst/pnpm2nix-nzbr";
      inputs = {
        flake-utils.follows = "flake-utils";
        nixpkgs.follows = "nixpkgs";
      };
    };
  };

  outputs =
    {
      self,
      nixpkgs,
      flake-utils,
      pnpm2nix,
    }:
    flake-utils.lib.eachDefaultSystem (
      system:
      let
        pkgs = import nixpkgs { inherit system; };
        nodejs = pkgs.nodejs_24;
        # pnpm creates an overly long PATH env variable for child processes.
        # This patch deduplicates entries in PATH, which results in an equivalent but shorter entry.
        # https://github.com/pnpm/pnpm/issues/6106
        # https://github.com/pnpm/pnpm/issues/8552
        pnpm = (pkgs.pnpm_10.overrideAttrs (prev: {
          postInstall = prev.postInstall + ''
            patch $out/libexec/pnpm/dist/pnpm.cjs ${./patches/pnpm-PATH-reduction.patch}
          '';
        }));
        inherit (pkgs)
          copyDesktopItems
          darwin
          lib
          makeBinaryWrapper
          makeDesktopItem
          makeShellWrapper
          moreutils
          removeReferencesTo
          stdenv
          wrapGAppsHook3
          xcodebuild
          which
          ;

        fullCleanSourceFilter =
          name: type:
          (lib.cleanSourceFilter name type)
          && (
            let
              baseName = baseNameOf (toString name);
            in
            # No need to copy the flake.
            # No need to copy local copy of node_modules.
            baseName != "flake.nix" && baseName != "flake.lock" && baseName != "node_modules"
          );
        fullCleanSource =
          src:
          lib.cleanSourceWith {
            filter = fullCleanSourceFilter;
            src = src;
          };
        packageJson = builtins.fromJSON (builtins.readFile ./package.json);
        packageJson = builtins.fromJSON (builtins.readFile ./package.json);

        makeApp =
          {
            app,
            buildTask,
            mainProgram,
            installCommands,
            preBuildCommands ? "",
          }:
          pnpm2nix.packages.${system}.mkPnpmPackage rec {
            pname = "trilium-${app}";
            version = packageJson.version + (lib.optionalString (self ? shortRev) "-${self.shortRev}");

            src = fullCleanSource ./.;
            packageJSON = ./package.json;
            pnpmLockYaml = ./pnpm-lock.yaml;

            workspace = fullCleanSource ./.;
            pnpmWorkspaceYaml = ./pnpm-workspace.yaml;

            inherit nodejs pnpm;

            extraNodeModuleSources = [
              rec {
                name = "patches";
                value = ./patches;
              }
            ];

            # remove pnpm version override
            preConfigure = ''
              cat package.json | grep -v 'packageManager' | sponge package.json
            '';

            postConfigure =
              ''
                chmod +x node_modules/electron/install.js
                patchShebangs --build node_modules
              '';

            extraNativeBuildInputs =
              [
                moreutils # sponge
                nodejs.python
                removeReferencesTo                
              ]
              ++ lib.optionals (app == "server") [
                makeBinaryWrapper
              ]
              ++ lib.optionals stdenv.hostPlatform.isDarwin [
                xcodebuild
                darwin.cctools
              ];
            dontWrapGApps = true;

            env.ELECTRON_SKIP_BINARY_DOWNLOAD = "1";

            preBuild = ''
              ${preBuildCommands}
            '';

            scriptFull = "pnpm run ${buildTask}";

            installPhase = ''
              runHook preInstall

              ${installCommands}

              runHook postInstall
            '';

            # This file is a symlink into /build which is not allowed.
            postFixup = ''
              rm $out/opt/trilium*/node_modules/better-sqlite3/node_modules/.bin/prebuild-install || true
            '';

            components = [
              "packages/codemirror"
              "packages/commons"
              "packages/express-partial-content"
              "packages/turndown-plugin-gfm"

              "apps/db-compare"
              "apps/dump-db"
              "apps/server"
              "apps/server-e2e"
            ];


        server = makeApp {
          app = "server";
          # pnpm throws an error at the end of `pnpm rebuild`, but it doesn't seem to matter:
          # ERR_PNPM_MISSING_HOISTED_LOCATIONS
          # vite@7.1.5(@types/node@24.3.0)(jiti@2.5.1)(less@4.1.3)(lightningcss@1.30.1)
          # (sass-embedded@1.91.0)(sass@1.91.0)(terser@5.43.1)(tsx@4.20.5)(yaml@2.8.1)
          # is not found in hoistedLocations inside node_modules/.modules.yaml
          preBuildCommands = ''
            pushd apps/server
            pnpm rebuild || true
            popd
          '';
          buildTask = "server:build";
          mainProgram = "trilium-server";
          installCommands = ''
            #remove-references-to -t ${nodejs.python} apps/server/dist/node_modules/better-sqlite3/build/config.gypi
            #remove-references-to -t ${pnpm} apps/server/dist/node_modules/better-sqlite3/build/config.gypi

            pushd apps/server/dist
            rm -rf node_modules/better-sqlite3/build/Release/obj \
                   node_modules/better-sqlite3/build/Release/obj.target \
                   node_modules/better-sqlite3/build/Release/sqlite3.a \
                   node_modules/better-sqlite3/build/{Makefile,better_sqlite3.target.mk,test_extension.target.mk,binding.Makefile} \
                   node_modules/better-sqlite3/deps/sqlite3
            popd

            mkdir -p $out/{bin,opt/trilium-server}
            cp --archive apps/server/dist/* $out/opt/trilium-server
            makeWrapper ${lib.getExe nodejs} $out/bin/trilium-server \
              --add-flags $out/opt/trilium-server/main.cjs
          '';
        };


      in
      {
        packages.server = server;

        packages.default = server;

        devShells.default = pkgs.mkShell {
          buildInputs = [
            nodejs
            pnpm
          ];
        };
      }
    );
}
