<template>
  <div class="hello">
    <el-table
      :data="tableData"
      style="width: 100%;margin-bottom: 20px;"
      row-key="id"
      border
      default-expand-all>
      <el-table-column
        prop="date"
        label="date"
        sortable
        width="270">
      </el-table-column>
      <el-table-column
        prop="name"
        label="Name"
        sortable
        width="90">
      </el-table-column>
    </el-table>
    <h1>{{ msg }}</h1>
    <h2>Essential Links</h2>
    <ul>
      <li>
        <a
          href="https://vuejs.org"
          target="_blank"
        >
          Core Docs
        </a>
      </li>
      <li>
        <a
          href="https://forum.vuejs.org"
          target="_blank"
        >
          Forum
        </a>
      </li>
      <li>
        <a
          href="https://chat.vuejs.org"
          target="_blank"
        >
          Community Chat
        </a>
      </li>
      <li>
        <a
          href="https://twitter.com/vuejs"
          target="_blank"
        >
          Twitter
        </a>
      </li>
      <br>
      <li>
        <a
          href="http://vuejs-templates.github.io/webpack/"
          target="_blank"
        >
          Docs for This Template
        </a>
      </li>
    </ul>
    <h2>Ecosystem</h2>
    <ul>
      <li>
        <a
          href="http://router.vuejs.org/"
          target="_blank"
        >
          vue-router
        </a>
      </li>
      <li>
        <a
          href="http://vuex.vuejs.org/"
          target="_blank"
        >
          vuex
        </a>
      </li>
      <li>
        <a
          href="http://vue-loader.vuejs.org/"
          target="_blank"
        >
          vue-loader
        </a>
      </li>
      <li>
        <a
          href="https://github.com/vuejs/awesome-vue"
          target="_blank"
        >
          awesome-vue
        </a>
      </li>
    </ul>
  </div>
</template>

<script>
import api from '../api/index'

export default {
  name: 'HelloWorld',
  data () {
    return {
      msg: 'Welcome to Your Vue.js App',
      status: '',
      tableData: [],
    }
  },
  async mounted() {
    await this.checkStatus();
    await this.retrieveParkingList();
  },
  methods: {
    load(tree, treeNode, resolve) {
      setTimeout(() => {
        resolve([
          {
            id: 31,
            date: '2016-05-01',
            name: 'wangxiaohu'
          }, {
            id: 32,
            date: '2016-05-01',
            name: 'wangxiaohu'
          }
        ])
      }, 1000)
    },
    async checkStatus() {
      const result = await api.checkStatus();
      console.log(result.status)
      this.status = result.status;
      setTimeout(this.checkStatus, 5000)
    },
    async retrieveParkingList() {
      const result = await api.retrieveParkingList();
      this.tableData.length = 0;
      for (const parking of result.parkingList) {
        this.tableData.push({
          id: parking.parkingId,
          date: parking.parkingName,
          name: parking.cycleList.length + '台',
          children: parking.cycleList.map((cycle) => {
            return {
              id: cycle.CycleName,
              date: cycle.CycleName,
              name: ''
            }
          })
        })
      }
      setTimeout(this.retrieveParkingList, 5000)
    }
  }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
h1, h2 {
  font-weight: normal;
}
ul {
  list-style-type: none;
  padding: 0;
}
li {
  display: inline-block;
  margin: 0 10px;
}
a {
  color: #42b983;
}
</style>
