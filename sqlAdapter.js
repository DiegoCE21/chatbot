const sql = require("mssql");

class SqlAdapter {
  constructor(config) {
    this.config = config;
  }

  async connect() {
    if (!this.pool) {
      this.pool = await sql.connect(this.config);
    }
    return this.pool;
  }

  async getCategorias() {
    console.log("Consulta 1: ");

    const pool = await this.connect();
    const result = await pool.request().query("SELECT * FROM Categorias");
    return result.recordset;
  }

  async getProductos() {
    console.log("Consulta 2: ");

    const pool = await this.connect();
    const result = await pool.request().query("SELECT * FROM Productos");
    return result.recordset;
  }

  async getSubcategorias(categoria) {
    console.log("Consulta 3: ");

    const pool = await this.connect();
    let query = "SELECT * FROM Subcategorias";
    if (categoria) {
      query += ` WHERE ProductCategoryKey = @categoria`;
      const result = await pool.request().input("categoria", sql.Int, categoria).query(query);
      return result.recordset;
    }
    const result = await pool.request().query(query);
    return result.recordset;
  }





  async getProductInfo(productName) {
    console.log("Consulta para obtener información de un producto:", productName);
  
    const pool = await this.connect();
    const query = `
      SELECT ProductName, 
             ModelName, 
             ProductDescription, 
             ProductColor, 
             ProductSize, 
             ProductStyle, 
             ProductPrice
      FROM Productos
      WHERE ProductName LIKE @productName
    `;
  
    const result = await pool
      .request()
      .input("productName", sql.VarChar, `%${productName}%`)
      .query(query);
  
    return result.recordset[0]; // Devuelve el primer producto encontrado
  }
  
 /* async getProductosPorCategoria(categoria) {
    const pool = await this.connect();
    const query = `
      SELECT p.*
      FROM Productos p
      INNER JOIN Subcategorias s ON p.ProductSubcategoryKey = s.ProductSubcategoryKey
      INNER JOIN Categorias c ON s.ProductCategoryKey = c.ProductCategoryKey
      WHERE c.CategoryName LIKE @categoria
    `;
    const result = await pool.request().input("categoria", sql.VarChar, `%${categoria}%`).query(query);
    return result.recordset;
  }*/

    async getProductosPorSubcategoria(subcategoria) {
      console.log("Consulta SQL ejecutada: ");

      const pool = await this.connect();
      
      // Crear la consulta SQL
      const query = `
        SELECT p.ProductName, 
               p.ProductDescription, 
               p.ProductColor, 
               p.ProductSize, 
               p.ProductStyle, 
               p.ProductPrice 
        FROM Productos p
        JOIN Subcategorias s ON p.ProductSubcategoryKey = s.ProductSubcategoryKey
        WHERE s.SubcategoryName LIKE @subcategoria
      `;
    
      console.log("Consulta SQL ejecutada: ", query);
      console.log("Parámetro: subcategoria = ", subcategoria);
    
      const result = await pool.request().input("subcategoria", sql.VarChar, `%${subcategoria}%`).query(query);
      
      return result.recordset;
    }
    
    async getProductosPorSubcategoriakey(subcategoria) {
      console.log("Consulta SQL ejecutada: ");

      const pool = await this.connect();
      
      // Crear la consulta SQL
      const query = `
        SELECT p.ProductName, 
               p.ProductDescription, 
               p.ProductColor, 
               p.ProductSize, 
               p.ProductStyle, 
               p.ProductPrice 
        FROM Productos p
        JOIN Subcategorias s ON p.ProductSubcategoryKey = s.ProductSubcategoryKey
        WHERE s.ProductCategoryKey LIKE @subcategoria
      `;
    
      console.log("Consulta SQL ejecutada: ", query);
      console.log("Parámetro: subcategoria = ", subcategoria);
    
      const result = await pool.request().input("subcategoria", sql.VarChar, `%${subcategoria}%`).query(query);
      
      return result.recordset;
    }
    

  async getProductosPorRangoPrecio(min, max) {
    console.log("Consulta4: ");

    const pool = await this.connect();
    const query = "SELECT * FROM Productos WHERE ProductPrice BETWEEN @min AND @max";
    const result = await pool
      .request()
      .input("min", sql.Float, min)
      .input("max", sql.Float, max)
      .query(query);
    return result.recordset;
  }

  async getProductoMasCaroPorSubcategoria(subcategoria) {
    console.log("Consulta: Producto más caro por subcategoría");
  
    const pool = await this.connect();
    const query = `
      SELECT TOP 1 p.ProductName, 
                   p.ProductDescription, 
                   p.ProductPrice
      FROM Productos p
      JOIN Subcategorias s ON p.ProductSubcategoryKey = s.ProductSubcategoryKey
      WHERE s.SubcategoryName LIKE @subcategoria
      ORDER BY p.ProductPrice DESC
    `;
  
    const result = await pool.request().input("subcategoria", sql.VarChar, `%${subcategoria}%`).query(query);
    return result.recordset[0]; 
  }

  async getProductoMasCaro(categoria) {
    console.log("Consulta para el producto más caro en categoría:", categoria);
  
    const pool = await this.connect();
    const query = `
      SELECT TOP 1 p.ProductName, 
                    p.ProductDescription, 
                    p.ProductPrice
      FROM Productos p
      INNER JOIN Subcategorias s ON p.ProductSubcategoryKey = s.ProductSubcategoryKey
      INNER JOIN Categorias c ON s.ProductCategoryKey = c.ProductCategoryKey
      WHERE c.CategoryName LIKE @categoria
      ORDER BY p.ProductPrice DESC
    `;
    
    const result = await pool.request().input("categoria", sql.VarChar, `%${categoria}%`).query(query);
    return result.recordset[0]; 
  }
  
  async getCategorias() {
    console.log("Consulta de categorías ejecutada.");
    const pool = await this.connect();
    const query = "SELECT CategoryName FROM Categorias";
    const result = await pool.request().query(query);
    return result.recordset; 
  }

  async getTerritorios() {
    console.log("Consulta de territorios ejecutada.");
    const pool = await this.connect();
    const query = `
      SELECT Region, Country, Continent 
      FROM Territorios 
      ORDER BY Continent, Country, Region
    `;
    const result = await pool.request().query(query);
    return result.recordset;
  }



  async getProductoMasBaratoPorSubcategoria(subcategoria) {
    console.log("Consulta: Producto más barato por subcategoría");

    const pool = await this.connect();
    const query = `
      SELECT TOP 1 p.ProductName, 
                   p.ProductDescription, 
                   p.ProductPrice
      FROM Productos p
      JOIN Subcategorias s ON p.ProductSubcategoryKey = s.ProductSubcategoryKey
      WHERE s.SubcategoryName LIKE @subcategoria
      ORDER BY p.ProductPrice ASC
    `;

    const result = await pool.request()
                             .input("subcategoria", sql.VarChar, `%${subcategoria}%`)
                             .query(query);
    return result.recordset[0];
}

async getProductoMasBarato(categoria) {
  console.log("Consulta para el producto más barato en categoría:", categoria);

  const pool = await this.connect();
  const query = `
    SELECT TOP 1 p.ProductName, 
                 p.ProductDescription, 
                 p.ProductPrice
    FROM Productos p
    INNER JOIN Subcategorias s ON p.ProductSubcategoryKey = s.ProductSubcategoryKey
    INNER JOIN Categorias c ON s.ProductCategoryKey = c.ProductCategoryKey
    WHERE c.CategoryName LIKE @categoria
    ORDER BY p.ProductPrice ASC
  `;

  const result = await pool.request()
                           .input("categoria", sql.VarChar, `%${categoria}%`)
                           .query(query);
  return result.recordset[0];
}







  /*const query = `
      MERGE UserPreferences AS target
      USING (SELECT @userID AS UserID) AS source
      ON (target.UserID = source.UserID)
      WHEN MATCHED THEN
          UPDATE SET
              PreferredCategories = COALESCE(target.PreferredCategories, '') + ';' + @category,
              PreferredSubcategories = COALESCE(target.PreferredSubcategories, '') + ';' + @subcategory,
              InteractionHistory = COALESCE(target.InteractionHistory, '') + ';' + @interaction,
              LastInteraction = GETDATE()
      WHEN NOT MATCHED THEN
          INSERT (UserID, PreferredCategories, PreferredSubcategories, InteractionHistory, LastInteraction)
          VALUES (@userID, @category, @subcategory, @interaction, GETDATE());
  `;*/
  async saveUserInteraction(userID, category = null, subcategory = null, interaction = null, userAge = null, hasChildren = null, hasBicycle = null, numberOfChildren = null) {
    const pool = await this.connect();
  const query = `
      MERGE UserPreferences AS target
      USING (SELECT 
                @userID AS UserID,
                @userAge AS UserAge,
                @hasChildren AS HasChildren,
                @hasBicycle AS HasBicycle,
                @numberOfChildren AS NumberOfChildren
            ) AS source
      ON (target.UserID = source.UserID)
      WHEN MATCHED THEN
          UPDATE SET
              PreferredCategories = COALESCE(target.PreferredCategories, '') + ';' + @category,
              PreferredSubcategories = COALESCE(target.PreferredSubcategories, '') + ';' + @subcategory,
              InteractionHistory = COALESCE(target.InteractionHistory, '') + ';' + @interaction,
              LastInteraction = GETDATE(),
              UserAge = COALESCE(source.UserAge, target.UserAge),
              HasChildren = COALESCE(source.HasChildren, target.HasChildren),
              HasBicycle = COALESCE(source.HasBicycle, target.HasBicycle),
              NumberOfChildren = COALESCE(source.NumberOfChildren, target.NumberOfChildren)
      WHEN NOT MATCHED THEN
          INSERT (UserID, PreferredCategories, PreferredSubcategories, InteractionHistory, LastInteraction, UserAge, HasChildren, HasBicycle, NumberOfChildren)
          VALUES (@userID, @category, @subcategory, @interaction, GETDATE(), @userAge, @hasChildren, @hasBicycle, @numberOfChildren);
  `;

  await pool.request()
      .input("userID", sql.NVarChar, userID)
      .input("category", sql.NVarChar, category)
      .input("subcategory", sql.NVarChar, subcategory)
      .input("interaction", sql.NVarChar, interaction)
      .input("userAge", sql.Int, userAge)
      .input("hasChildren", sql.Bit, hasChildren)
      .input("hasBicycle", sql.Bit, hasBicycle)
      .input("numberOfChildren", sql.Int, numberOfChildren)
      .query(query);
}

async getUserPreferences(userID) {
  const pool = await this.connect();
  const query = "SELECT * FROM UserPreferences WHERE UserID = @userID";
  const result = await pool.request()
      .input("userID", sql.NVarChar, userID)
      .query(query);
  return result.recordset[0];
}



  
}

module.exports = SqlAdapter;
