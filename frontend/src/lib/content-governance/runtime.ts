export type DeploymentEnvironment =
  "development" | "preview" | "staging" | "production";

export function deploymentEnvironment(
  value = process.env.DEPLOYMENT_ENV,
): DeploymentEnvironment {
  switch (value) {
    case "production":
    case "staging":
    case "preview":
    case "development":
      return value;
    default:
      return "development";
  }
}

export function isProductionEnvironment(
  environment = deploymentEnvironment(),
): boolean {
  return environment === "production";
}
