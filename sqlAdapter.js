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

  async getSubcategorias(categoria = null) {
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
    
      // Mostrar la consulta SQL con los parámetros antes de ejecutarla
      console.log("Consulta SQL ejecutada: ", query);
      console.log("Parámetro: subcategoria = ", subcategoria);
    
      // Ejecutar la consulta
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
    return result.recordset[0]; // Devuelve el producto más caro.
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
    return result.recordset[0]; // Retornar el primer (y único) registro
  }
  
  async getCategorias() {
    console.log("Consulta de categorías ejecutada.");
    const pool = await this.connect();
    const query = "SELECT CategoryName FROM Categorias";
    const result = await pool.request().query(query);
    return result.recordset; // Devuelve una lista de categorías
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
    return result.recordset; // Devuelve una lista de territorios
  }
  
}

module.exports = SqlAdapter;
