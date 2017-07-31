// Use whatever namespacing works for your project.
namespace Dwuh.Controllers.API.DWUH
{
    using System.Configuration;
    using System.IO;
    using System.Linq;
    using System.Net;
    using System.Net.Http;
    using System.Threading.Tasks;
    using System.Web;
    using System.Web.Http;

    using Umbraco.Web.WebApi;

    // If you want this endpoint to only be accessible when the user is logged in, 
    // then use UmbracoAuthorizedApiController instead of UmbracoApiController
    public class FileUploadApiController : UmbracoApiController
    {
        public async Task<HttpResponseMessage> UploadFileToServer()
        {
            if (!Request.Content.IsMimeMultipartContent())
            {
                throw new HttpResponseException(HttpStatusCode.UnsupportedMediaType);
            }

            // Make this directory whatever makes sense for your project.
            var root = HttpContext.Current.Server.MapPath(ConfigurationManager.AppSettings["NHLERoute"]);
            Directory.CreateDirectory(root);
            var provider = new MultipartFormDataStreamProvider(root);
            var result = await Request.Content.ReadAsMultipartAsync(provider);

            // Build a list of the filenames of the files saved from your upload, to return to sender.
            var fileName = result.FileData.Aggregate(string.Empty, (current, file) => current + ("," + file.LocalFileName));
            return Request.CreateResponse(HttpStatusCode.OK, fileName);
        }
    }
}
