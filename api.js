const axios = require("axios");

const NEWSAPI_KEY = "67a14609965043f8a11737304bb37d60";

async function getTeslaNews() {
    try {
        const response = await axios.get(
            `https://newsapi.org/v2/everything?q=tesla&from=2024-01-27&sortBy=publishedAt&apiKey=8f229b9306ae48bd9cb05211e0bfecd2` +
                `&pageSize=10`
        );
        const responseData = response?.data?.articles;

        if (!responseData) {
            return null;
        }

        return responseData.map((article) => ({
            source: article.source.name,
            author: article.author,
            title: article.title,
            description: article.description,
            url: article.url,
            urlToImage: article.urlToImage,
            publishedAt: article.publishedAt,
            content: article.content,
        }));
    } catch (error) {
        console.error("Error fetching Tesla news:", error.message);
        return null;
    }
}

module.exports = {
    getTeslaNews,
};
