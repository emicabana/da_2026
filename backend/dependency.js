const dependencies = new Map();

export function getDependency(name) {
    return dependencies.get(name);
}

export function addDependency(name, dependency) {
    if (dependencies.has(name)) {
        throw new Error(`Dependency with name ${name} already exists`);
    }
    dependencies.set(name, dependency);
}