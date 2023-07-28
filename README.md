## Database

#### Config connection string

Please fill in the DATABASE_CONNECTION value in the corresponding environment configuration.

The configuration file is typically stored in the project's root directory, such as `.env.devnet`.

```
DATABASE_CONNECTION=""
```

#### Create Database

```sql
CREATE DATABASE assist_withdraw;
```

#### Create Tables

```shell
yarn db:devnet
```
