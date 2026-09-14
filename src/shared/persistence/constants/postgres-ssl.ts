/** Query keys that make node-postgres replace a Pool `ssl` object. */
export enum PostgresSslQueryParam {
  SslMode = 'sslmode',
  SslRootCert = 'sslrootcert',
  SslCert = 'sslcert',
  SslKey = 'sslkey',
}
