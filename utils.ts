import SecretManager from "aws-sdk/clients/secretsmanager";

export const getSecret = async (secretId: string) => {
  const client = new SecretManager();
  const secret = await client.getSecretValue({ SecretId: secretId }).promise();
  if (!secret.SecretString) {
    throw new Error("No secret found");
  }
  return secret.SecretString;
};
