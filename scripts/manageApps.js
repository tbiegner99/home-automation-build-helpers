const fs = require("fs").promises;
const path = require("path");
/* eslint-disable global-require */
const {
  APP_KEY,
  APP_TITLE,
  APP_DESCRIPTION,
  APP_VERSION,
  APP_FILENAME,
  APP_ROUTES,
  APP_ROUTES_MATCH_MODE,
  APP_PRIORITY,
  APP_COMMIT,
  APP_ARTIFACT_NAME,
  APP_ICON,
  IS_MODULE,
  FUNCTION = "",
  SKIP_APP_CONFIG,
  APPS_DB_DIR = process.cwd(),
  APPS_CONFIG_DIR = process.cwd(),
  STATIC_ROUTES_FILE = path.join(process.cwd(), "./config", "/statics.json"),
  IMPORT_MAP_DIR = process.cwd(),
} = process.env;

console.log("Params passed:", {
  APP_KEY,
  APP_TITLE,
  APP_DESCRIPTION,
  APP_VERSION,
  APP_FILENAME,
  APP_ARTIFACT_NAME,
  APP_ROUTES,
  APP_ROUTES_MATCH_MODE,
  APP_PRIORITY,
  APP_COMMIT,
  IS_MODULE,
  FUNCTION,
  SKIP_APP_CONFIG,
  APPS_DB_DIR,
  APPS_CONFIG_DIR,
  STATIC_ROUTES_FILE,
  IMPORT_MAP_DIR,
});

const enforceRequired = (key, value) => {
  if (!Boolean(value)) {
    throw new Error(key + " is required");
  }
};

const enforceValidKey = async (key, value) => {
  await enforceRequired(key, value);
  const validAppKey = /^[@a-zA-Z0-9_]+(-?[@_a-zA-Z0-9/]+)*$/;
  if (!value.match(validAppKey)) {
    throw new Error(key + " is not a valid key");
  }
};

const enforceRequiredParameters = async () => {
  await enforceValidKey("APP_KEY", APP_KEY);
  await enforceRequired("APP_TITLE", APP_TITLE);
  await enforceRequired("APP_FILENAME", APP_FILENAME);
};

const APPS_BASE_PATH = "/app";
const APPS_DB_FILE = path.join(APPS_DB_DIR, "./appsDB.json");
const APPS_CONFIG_FILE = path.join(APPS_CONFIG_DIR, "./appConfig.json");
const IMPORT_MAP_FILE = path.join(IMPORT_MAP_DIR, "./import-map.json");

const isAddingApp = () =>
  Boolean(APP_KEY) && Boolean(APP_TITLE) && Boolean(APP_FILENAME);

const saveImportMap = async (map) => {
  await fs.writeFile(IMPORT_MAP_FILE, JSON.stringify(map, null, 4));
};

const loadStaticRoutes = async () => {
  try {
    const statics = await fs.readFile(STATIC_ROUTES_FILE);
    return JSON.parse(statics);
  } catch (err) {
    console.warn(err, "Returning empty statics routes");
    return {};
  }
};

const loadAppsDB = async () => {
  const content = await fs.readFile(APPS_DB_FILE);
  return JSON.parse(content);
};
const saveAppsDB = async (db) => {
  await fs.writeFile(APPS_DB_FILE, JSON.stringify(db, null, 4));
};

const sortApps = (app1, app2) => {
  if (app1.priority < app2.priority) {
    return 1;
  } else if (app1.priority > app2.priority) {
    return -1;
  } else if (app1.title < app2.title) {
    return -1;
  }
  return 1;
};

const saveAppsArray = async () => {
  if (SKIP_APP_CONFIG === "true") {
    return;
  }
  const db = await loadAppsDB();
  const apps = Object.values(db)
    .filter((app) => !app.module)
    .sort(sortApps);
  await fs.writeFile(APPS_CONFIG_FILE, JSON.stringify(apps, null, 4));
};

const removeApplication = async (app) => {
  const db = await loadAppsDB();
  delete db[app];
  await saveAppsDB(db);
  await saveAppsArray();
};

const addApplication = async () => {
  await enforceRequiredParameters();

  const routes = !APP_ROUTES
    ? null
    : APP_ROUTES.split(",")
        .map((route) => route.trim())
        .filter((route) => route.length > 0);

  const priority = Number.parseInt(APP_PRIORITY, 10);

  const appData = {
    name: APP_KEY,
    title: APP_TITLE,
    package: APP_KEY,
    priority: Number.isNaN(priority) ? 0 : priority,
    filename: APP_ARTIFACT_NAME || APP_FILENAME,
    description: APP_DESCRIPTION,
    version: APP_VERSION,
    icon: APP_ICON,
    module: IS_MODULE === "true",
    build: APP_COMMIT,
    routes: {
      routes,
      mode: APP_ROUTES_MATCH_MODE,
    },
  };
  console.log("ADDING APP", appData);
  const appDBEntry = { [APP_KEY]: appData };
  const db = await loadAppsDB();
  const newDb = Object.assign({}, db, appDBEntry);
  await saveAppsDB(newDb);

  await saveAppsArray();
};

const fileExists = async (file) => {
  try {
    await fs.access(file);
    return true;
  } catch (e) {
    return false;
  }
};
const initializeFiles = async () => {
  const appsDBExists = await fileExists(APPS_DB_FILE);
  if (!appsDBExists) {
    await saveAppsDB({});
  }
  await saveAppsArray();
};

//-------------------

const convertAppToRoute = (app) => ({
  [app.package]: `${APPS_BASE_PATH}/${app.name}/${app.filename}`,
});

const constructImportMap = async () => {
  const statics = await loadStaticRoutes();
  const apps = await loadAppsDB();
  const appRoutes = Object.values(apps).map(convertAppToRoute);
  const imports = Object.assign({}, statics, ...appRoutes);
  await saveImportMap({ imports });
};

const main = async () => {
  await initializeFiles();

  const func = FUNCTION.toLowerCase();

  if (func === "add" && isAddingApp()) {
    await addApplication();
    console.log("APP Added");
  } else if (func === "remove") {
    console.log(`Removing App ${APP_KEY}`);
    await enforceValidKey("APP_KEY", APP_KEY);
    await removeApplication(APP_KEY);
    console.log(`App removed ${APP_KEY}`);
  }

  await constructImportMap();
};

main()
  .then(() => console.log("DONE"))
  .catch((err) => console.log(err));
