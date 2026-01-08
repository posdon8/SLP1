const mongoose = require("mongoose");
const Course = require("./src/models/Course");

const MONGO_URI = "mongodb://127.0.0.1:27017/lmsdb";

async function seedData() {
  await mongoose.connect(MONGO_URI);
  await Course.deleteMany();

  const courses = [
    {
      title: "Khóa học ReactJS toàn tập",
      description: "Học cách xây dựng ứng dụng React hiện đại với hooks và state management.",
      instructor: "Phạm Minh Cường",
      thumbnail: "https://i.imgur.com/react-thumb.jpg",
      level: "Intermediate",
      totalStudents: 200,
      sections: [
        {
          title: "Phần 1: Cơ bản về React",
          lessons: [
            {
              title: "Giới thiệu về React",
              videoUrl: "https://example.com/react1.mp4",
              duration: 10
            },
            {
              title: "Cấu trúc Component",
              videoUrl: "https://example.com/react2.mp4",
              duration: 12
            }
          ]
        },
        {
          title: "Phần 2: Hooks và State nâng cao",
          lessons: [
            {
              title: "Sử dụng useState và useEffect",
              videoUrl: "https://example.com/react3.mp4",
              duration: 15
            },
            {
              title: "Custom Hooks",
              videoUrl: "https://example.com/react4.mp4",
              duration: 18
            }
          ]
        }
      ],
      reviews: [
        { user: "user3", stars: 5, comment: "Bài giảng rất chi tiết." },
        { user: "user4", stars: 4, comment: "Nên có thêm bài tập thực hành." }
      ],
      isFree: false,
      price: 399000
    }
  ];

  await Course.insertMany(courses);
  console.log("✅ Seed data inserted successfully!");
  process.exit();
}

seedData().catch((err) => console.error(err));
